import { Expose } from 'class-transformer';

export class FolderResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  parentId?: string;

  @Expose()
  createdBy: string;

  @Expose()
  isDeleted: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  breadcrumb?: Array<{
    id: string;
    name: string;
  }>;

  @Expose()
  children?: FolderResponseDto[];

  @Expose()
  documents?: Array<{
    id: string;
    name: string;
    files: Array<{
      id: string;
      url: string;
      mimeType: string;
      sizeKB: number;
      extension: string;
      uploadedAt: Date;
    }>;
  }>;
}
