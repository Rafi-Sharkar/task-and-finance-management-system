import { Expose } from 'class-transformer';

export class DocumentResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  folderId: string;

  @Expose()
  uploadedBy: string;

  @Expose()
  uploaderRole: string;

  @Expose()
  status: string;

  @Expose()
  statusByClient: string;

  @Expose()
  shareToClient: boolean;

  @Expose()
  clientShareTypes?: string;

  @Expose()
  isSigned: boolean;

  @Expose()
  documentCateory: string;

  @Expose()
  isDeleted: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  files?: Array<{
    id: string;
    url: string;
    mimeType: string;
    sizeKB: number;
    extension: string;
    uploadedAt: Date;
  }>;

  @Expose()
  client?: {
    id: string;
    fullName: string;
    email: string;
  };

  @Expose()
  folder?: {
    id: string;
    name: string;
  };

  @Expose()
  uploader?: {
    id: string;
    fullName: string;
    email: string;
  };
}
