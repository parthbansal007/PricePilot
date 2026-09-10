# AWS IAM Setup

1. Open AWS Console and go to **IAM**.
2. Go to **Roles** -> **Create role**.
3. Choose **Custom trust policy** (or AWS Service -> App Runner).
4. Add permissions:
   - `AmazonS3FullAccess` (or a restricted policy for just your S3 bucket).
   - `SecretsManagerReadWrite` (or restricted to your specific secrets).
5. Name the role `PricePilotAppRunnerRole`.
6. Attach this role as the Instance Role when configuring your App Runner service.
