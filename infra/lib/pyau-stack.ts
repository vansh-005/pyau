import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as location from "aws-cdk-lib/aws-location";
import * as amplify from "aws-cdk-lib/aws-amplify";
import * as secrets from "aws-cdk-lib/aws-secretsmanager";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as cr from "aws-cdk-lib/custom-resources";
import * as ecrAssets from "aws-cdk-lib/aws-ecr-assets";

export class PyauStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const region = this.region;

    // ---- Data ----
    const table = new dynamodb.Table(this, "Table", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    table.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
    });
    table.addGlobalSecondaryIndex({
      indexName: "GSI2",
      partitionKey: { name: "GSI2PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI2SK", type: dynamodb.AttributeType.STRING },
    });

    const bucket = new s3.Bucket(this, "Bucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [{ expiration: cdk.Duration.days(30) }],
      cors: [{ allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET], allowedOrigins: ["*"], allowedHeaders: ["*"] }],
    });

    const tokenSecret = new secrets.Secret(this, "DemoTokenSecret", {
      generateSecretString: { passwordLength: 48, excludePunctuation: true },
    });

    // ---- Auth ----
    const pool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    new cognito.CfnUserPoolGroup(this, "CoordinatorGroup", { userPoolId: pool.userPoolId, groupName: "coordinator" });
    new cognito.CfnUserPoolGroup(this, "HostGroup", { userPoolId: pool.userPoolId, groupName: "host" });
    const client = pool.addClient("WebClient", {
      authFlows: { userPassword: true, userSrp: true },
      generateSecret: false,
    });

    // ---- Backend (zip Lambda; staged by scripts/stage_backend.py) ----
    const backendCode = lambda.Code.fromAsset(path.join(__dirname, "..", "build", "backend"));
    const apiFn = new lambda.Function(this, "ApiFn", {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: backendCode,
      handler: "services.api.handler.handler",
      timeout: cdk.Duration.seconds(15),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_WEEK,
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: bucket.bucketName,
        DEMO_TOKEN_SECRET_ARN: tokenSecret.secretArn,
        POLLY_VOICE_ID: "Kajal",
        POLLY_ENGINE: "neural",
        LOCATION_ROUTE_TRAVEL_MODE: "Scooter",
        LOG_LEVEL: "INFO",
      },
    });
    table.grantReadWriteData(apiFn);
    bucket.grantReadWrite(apiFn);
    tokenSecret.grantRead(apiFn);
    apiFn.addToRolePolicy(new iam.PolicyStatement({ actions: ["polly:SynthesizeSpeech"], resources: ["*"] }));
    apiFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["geo-routes:CalculateRoutes", "geo-places:ReverseGeocode"],
        resources: ["*"],
      }),
    );

    // ---- Agent (Strands on Bedrock) as a Lambda container image ----
    const bedrockModelId = this.node.tryGetContext("bedrockModelId") ?? "global.amazon.nova-2-lite-v1:0";
    const baseModelId = bedrockModelId.replace(/^(global|apac|us|eu|in)\./, "");
    const agentFn = new lambda.DockerImageFunction(this, "AgentFn", {
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, "..", ".."), {
        file: "services/agent/Dockerfile",
        platform: ecrAssets.Platform.LINUX_AMD64,
      }),
      timeout: cdk.Duration.seconds(180),
      memorySize: 1024,
      logRetention: logs.RetentionDays.ONE_WEEK,
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: bucket.bucketName,
        BEDROCK_REGION: region,
        BEDROCK_MODEL_ID: bedrockModelId,
        MAX_AGENT_SECONDS: "120",
        MAX_TOOL_CALLS: "12",
        LOG_LEVEL: "INFO",
      },
    });
    table.grantReadWriteData(agentFn);
    bucket.grantRead(agentFn);
    // Global inference profile: the profile in this region plus the foundation model in every destination region.
    agentFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream", "bedrock:Converse", "bedrock:ConverseStream"],
        resources: [
          `arn:aws:bedrock:${region}:${this.account}:inference-profile/${bedrockModelId}`,
          `arn:aws:bedrock:*::foundation-model/${baseModelId}`,
        ],
      }),
    );

    // ---- API ----
    const authorizer = new HttpJwtAuthorizer("Jwt", `https://cognito-idp.${region}.amazonaws.com/${pool.userPoolId}`, {
      jwtAudience: [client.userPoolClientId],
    });
    const integration = new HttpLambdaIntegration("ApiInt", apiFn);
    const api = new apigwv2.HttpApi(this, "HttpApi", {
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [apigwv2.CorsHttpMethod.ANY],
        allowHeaders: ["authorization", "content-type", "x-demo-token"],
      },
    });
    api.addRoutes({ path: "/health", methods: [apigwv2.HttpMethod.GET], integration });
    api.addRoutes({ path: "/auth/whoami", methods: [apigwv2.HttpMethod.GET], integration, authorizer });
    // Explicit methods (not ANY) so API Gateway answers CORS preflight itself.
    const methods = [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE];
    for (const prefix of ["demo", "zones", "help", "runs", "proposals", "asks", "hosts", "points", "replays", "schedules"]) {
      api.addRoutes({ path: `/${prefix}/{proxy+}`, methods, integration });
    }

    // ---- Amplify Hosting (manual zip deploys via scripts/deploy_web.py) ----
    const amp = new amplify.CfnApp(this, "WebApp", {
      name: "pyau-web",
      customRules: [
        {
          source: "</^[^.]+$|[.](?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp|mp3|mjs|wasm|webmanifest|mp4|pbf)$)([^.]+$)/>",
          target: "/index.html",
          status: "200",
        },
      ],
    });
    const branch = new amplify.CfnBranch(this, "WebBranch", { appId: amp.attrAppId, branchName: "main", stage: "PRODUCTION" });
    const webUrl = `https://${branch.branchName}.${amp.attrDefaultDomain}`;

    // ---- Location maps API key (maps only, referrer restricted) ----
    const mapKey = new location.CfnAPIKey(this, "MapKey", {
      keyName: "pyau-maps",
      noExpiry: true,
      restrictions: {
        allowActions: ["geo-maps:*"],
        allowResources: [`arn:aws:geo-maps:${region}::provider/default`],
        allowReferers: [`${webUrl}/*`, "http://localhost:5173/*"],
      },
    });
    const keyValue = new cr.AwsCustomResource(this, "MapKeyValue", {
      onCreate: {
        service: "Location",
        action: "describeKey",
        parameters: { KeyName: mapKey.keyName },
        physicalResourceId: cr.PhysicalResourceId.of("pyau-maps-value"),
      },
      onUpdate: {
        service: "Location",
        action: "describeKey",
        parameters: { KeyName: mapKey.keyName },
        physicalResourceId: cr.PhysicalResourceId.of("pyau-maps-value"),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({ actions: ["geo:DescribeKey"], resources: ["*"] }),
      ]),
    });
    keyValue.node.addDependency(mapKey);

    // ---- Outputs ----
    new cdk.CfnOutput(this, "AgentFunctionName", { value: agentFn.functionName });
    new cdk.CfnOutput(this, "BedrockModelId", { value: bedrockModelId });
    new cdk.CfnOutput(this, "ApiUrl", { value: api.apiEndpoint });
    new cdk.CfnOutput(this, "UserPoolId", { value: pool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", { value: client.userPoolClientId });
    new cdk.CfnOutput(this, "TableName", { value: table.tableName });
    new cdk.CfnOutput(this, "BucketName", { value: bucket.bucketName });
    new cdk.CfnOutput(this, "AmplifyAppId", { value: amp.attrAppId });
    new cdk.CfnOutput(this, "WebUrl", { value: webUrl });
    new cdk.CfnOutput(this, "MapApiKey", { value: keyValue.getResponseField("Key") });
  }
}
