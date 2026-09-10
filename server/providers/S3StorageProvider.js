import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export class S3StorageProvider {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      // In AWS App Runner, credentials are automatically provided by IAM roles.
      // If running locally with S3, you need AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in env
    });
    this.bucketName = process.env.S3_BUCKET_NAME;
  }

  async upload(file) {
    const filename = `${Date.now()}-${file.originalname}`;
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: `uploads/${filename}`,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.s3Client.send(command);

    // Return the public S3 URL (assuming bucket policy allows public read for this prefix)
    return `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/uploads/${filename}`;
  }
}
