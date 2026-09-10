# AWS S3 Setup

1. Open the AWS Console and go to **S3**.
2. Click **Create bucket**.
3. Name your bucket (e.g., `pricepilot-assets-123`).
4. Choose the region matching your App Runner instance.
5. In **Object Ownership**, choose **ACLs disabled**.
6. Uncheck **Block all public access** if you want profile pictures to be publicly accessible.
7. Click **Create bucket**.
8. Set the environment variable `STORAGE_PROVIDER=s3` and `S3_BUCKET_NAME=pricepilot-assets-123` in App Runner.
