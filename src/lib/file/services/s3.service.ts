import { ENVEnum } from '@/common/enum/env.enum';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly logger = new Logger(S3Service.name);

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>(ENVEnum.AWS_REGION);
    const accessKeyId = this.configService.get<string>(
      ENVEnum.AWS_ACCESS_KEY_ID,
    );
    const secretAccessKey = this.configService.get<string>(
      ENVEnum.AWS_SECRET_ACCESS_KEY,
    );

    this.bucketName = this.configService.get<string>(
      ENVEnum.AWS_S3_BUCKET_NAME,
    ) as string;

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: accessKeyId as string,
        secretAccessKey: secretAccessKey as string,
      },
    });
  }

  /**
   * Upload a file to S3
   * @param file - The file buffer to upload
   * @param folder - Optional folder path in the bucket
   * @param filename - Optional custom filename (if not provided, generates UUID)
   * @returns The URL of the uploaded file
   */
  async uploadFile(
    file: Express.Multer.File,
    folder = 'uploads',
    filename?: string,
  ): Promise<string> {
    try {
      const fileExtension = file.originalname.split('.').pop();
      const key = filename
        ? `${folder}/${filename}`
        : `${folder}/${randomUUID()}.${fileExtension}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      const fileUrl = `https://${this.bucketName}.s3.${this.configService.get(ENVEnum.AWS_REGION)}.amazonaws.com/${key}`;
      this.logger.log(`File uploaded successfully: ${fileUrl}`);

      return fileUrl;
    } catch (error) {
      this.logger.error('Error uploading file to S3:', error);
      throw error;
    }
  }

  /**
   * Delete a file from S3
   * @param fileUrl - The full URL or key of the file to delete
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract key from URL if full URL is provided
      let key = fileUrl;
      if (fileUrl.includes('amazonaws.com/')) {
        key = fileUrl.split('amazonaws.com/')[1];
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error('Error deleting file from S3:', error);
      throw error;
    }
  }

  /**
   * Get the public URL for a file
   * @param key - The S3 object key
   * @returns The public URL
   */
  getFileUrl(key: string): string {
    return `https://${this.bucketName}.s3.${this.configService.get(ENVEnum.AWS_REGION)}.amazonaws.com/${key}`;
  }
}
