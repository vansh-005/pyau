import * as cdk from "aws-cdk-lib";
import { PyauStack } from "../lib/pyau-stack";

const app = new cdk.App();
new PyauStack(app, "PyauStack", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "ap-south-1" },
});
