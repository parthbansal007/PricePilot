# AWS Deployment Guide

PricePilot is designed for cloud-native deployment on AWS.

## Architecture
- **Frontend**: AWS Amplify (React + Vite)
- **Backend**: AWS App Runner (Node.js/Express)
- **Database**: MongoDB Atlas
- **Storage**: Amazon S3
- **Monitoring**: AWS CloudWatch
- **Secrets**: AWS Secrets Manager

## Steps
1. **S3 Setup**: Create an S3 Bucket for profile pictures. Set `STORAGE_PROVIDER=s3`. (See `AWS_S3_SETUP.md`)
2. **IAM**: Create an IAM role for App Runner that allows access to your S3 bucket and Secrets Manager. (See `AWS_IAM_SETUP.md`)
3. **Secrets Manager**: Store your API keys in AWS Secrets Manager and link them to App Runner as environment variables. (See `AWS_SECRETS_SETUP.md`)
4. **App Runner**: Deploy the backend via GitHub integration or ECR. Ensure the port is read from the environment and it binds to `0.0.0.0`.
5. **Amplify**: Deploy the frontend via GitHub. Set the environment variable `VITE_API_BASE_URL` to point to your App Runner URL.
6. **CloudWatch**: Logs are automatically streamed from App Runner to CloudWatch. (See `AWS_MONITORING.md`)
