import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  nextAuthSecret: process.env.NEXTAUTH_SECRET,
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
  },
  sandbox: {
    url: process.env.SANDBOX_URL,
    token: process.env.SANDBOX_TOKEN,
  }
};
