import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dad5lcdoy',
  api_key: process.env.CLOUDINARY_API_KEY || '111742125773621',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'b5wKoEOA187AyYl3GySHyDxLv4k',
});

export async function uploadToCloudinary(filePath: string, folder: string = 'cloud_kitchen'): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
}

export default cloudinary;
