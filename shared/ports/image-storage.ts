export interface UploadResult {
  secureUrl: string
  publicId:  string
}

export interface ImageStoragePort {
  upload(buffer: Buffer, folder: string): Promise<UploadResult>
  delete(publicId: string): Promise<void>
}
