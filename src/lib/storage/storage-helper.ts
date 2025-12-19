import { userRepository } from "@/lib/repositories/auth-repository";
import { fileRepository } from "@/lib/repositories/file-repository";

export class StorageHelper {
  /**
   * Calculate the total storage used by a user in bytes.
   * Currently counts the size of all files owned by the user.
   */
  static async getUserStorageUsage(userId: string): Promise<number> {
    const files = await fileRepository.findByUserId(userId);
    return files.reduce((acc, file) => acc + (file.size || 0), 0);
  }

  /**
   * Check if a user has enough remaining storage to upload a file of specific size.
   * Returns true if user has space, false otherwise.
   */
  static async hasStorageSpace(userId: string, sizeInBytes: number): Promise<boolean> {
    const user = await userRepository.findById(userId);

    if (!user) return false;

    const currentUsage = await this.getUserStorageUsage(userId);
    const limit = Number(user.storageLimit || 0);

    return (currentUsage + sizeInBytes) <= limit;
  }

  /**
   * Get storage stats for a user (used, limit, percentage).
   */
  static async getStorageStats(userId: string) {
    const user = await userRepository.findById(userId);

    if (!user) {
        return { used: 0, limit: 0, percentage: 0 };
    }

    const used = await this.getUserStorageUsage(userId);
    const limit = Number(user.storageLimit || 0);
    
    return {
      used,
      limit,
      percentage: limit > 0 ? Math.min(100, (used / limit) * 100) : 100
    };
  }

  /**
   * Format bytes to human readable string
   */
  static formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }
}
