import { ENVEnum } from '@/common/enum/env.enum';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  resource_type: string;
  bytes: number;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>(
      ENVEnum.CLOUDINARY_CLOUD_NAME,
    );
    const apiKey = this.configService.get<string>(ENVEnum.CLOUDINARY_API_KEY);
    const apiSecret = this.configService.get<string>(
      ENVEnum.CLOUDINARY_API_SECRET,
    );

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn(
        'Cloudinary credentials not fully configured. File uploads may fail.',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  /**
   * Upload a single file to Cloudinary
   * @param file - Express Multer file object
   * @param folder - Optional folder path in Cloudinary
   * @returns CloudinaryUploadResult with upload details
   */
  async uploadFile(
    file: Express.Multer.File,
    folder = 'finance',
  ): Promise<CloudinaryUploadResult> {
    try {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto',
            allowed_formats: [
              'jpg',
              'jpeg',
              'png',
              'pdf',
              'doc',
              'docx',
              'xls',
              'xlsx',
              'ppt',
              'pptx',
              'gif',
              'webp',
            ],
          },
          (error, result) => {
            if (error) {
              this.logger.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              this.logger.log(
                `File uploaded successfully: ${result?.secure_url}`,
              );
              resolve(result as CloudinaryUploadResult);
            }
          },
        );

        streamifier.createReadStream(file.buffer).pipe(stream);
      });
    } catch (error) {
      this.logger.error('Error uploading file to Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files to Cloudinary
   * @param files - Array of Express Multer file objects
   * @param folder - Optional folder path in Cloudinary
   * @returns Array of CloudinaryUploadResult objects
   */
  async uploadFiles(
    files: Express.Multer.File[],
    folder = 'finance',
  ): Promise<CloudinaryUploadResult[]> {
    try {
      const uploadPromises = files.map((file) => this.uploadFile(file, folder));
      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      this.logger.error('Error uploading multiple files to Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Delete a file from Cloudinary
   * @param publicId - The public ID of the file to delete (from upload result)
   */
  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`File deleted successfully: ${publicId}`);
    } catch (error) {
      this.logger.error('Error deleting file from Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Delete multiple files from Cloudinary
   * @param publicIds - Array of public IDs to delete
   */
  async deleteFiles(publicIds: string[]): Promise<void> {
    try {
      const deletePromises = publicIds.map((publicId) =>
        this.deleteFile(publicId),
      );
      await Promise.all(deletePromises);
    } catch (error) {
      this.logger.error(
        'Error deleting multiple files from Cloudinary:',
        error,
      );
      throw error;
    }
  }
}
