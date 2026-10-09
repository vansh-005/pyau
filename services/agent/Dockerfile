FROM public.ecr.aws/lambda/python:3.12
COPY services/agent/requirements.txt ${LAMBDA_TASK_ROOT}/requirements.txt
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt
COPY packages/domain/pyau_domain ${LAMBDA_TASK_ROOT}/pyau_domain
COPY services ${LAMBDA_TASK_ROOT}/services
COPY fixtures/east-delhi-demo.json ${LAMBDA_TASK_ROOT}/east-delhi-demo.json
CMD ["services.agent.handler.handler"]
