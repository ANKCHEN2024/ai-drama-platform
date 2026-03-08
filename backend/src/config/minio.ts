import * as Minio from 'minio';

let minioClient: Minio.Client | null = null;
let bucketName = process.env.MINIO_BUCKET_NAME || 'drama-platform';

try {
  minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  });
} catch (error) {
  console.warn('MinIO client initialization failed:', error);
  console.warn('Running in local development mode without MinIO');
  minioClient = null;
}

export async function ensureBucketExists() {
  if (!minioClient) {
    console.warn('MinIO not available, skipping bucket creation');
    return;
  }
  
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`Bucket "${bucketName}" created successfully`);
    }
  } catch (err) {
    console.error('Error ensuring bucket exists:', err);
    console.warn('Continuing without MinIO bucket setup');
  }
}

export { minioClient, bucketName };
