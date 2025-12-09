import { prisma } from "@/lib/infra/prisma";

export class StorageHelper {
  /**
   * Calculate the total storage used by a user in bytes.
   * Currently counts the size of all files owned by the user.
   */
  static async getUserStorageUsage(userId: string): Promise<number> {
    const result = await prisma.file.aggregate({
      where: { userId },
      _sum: { size: true },
    });
    
    return result._sum.size || 0;
  }

  /**
   * Check if a user has enough remaining storage to upload a file of specific size.
   * Returns true if user has space, false otherwise.
   */
  static async hasStorageSpace(userId: string, sizeInBytes: number): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageLimit: true },
    });

    if (!user) return false;

    const currentUsage = await this.getUserStorageUsage(userId);
    const limit = Number(user.storageLimit); // Convert BigInt to Number for comparison (safe up to 9PB)

    return (currentUsage + sizeInBytes) <= limit;
  }

  /**
   * Get storage stats for a user (used, limit, percentage).
   */
  static async getStorageStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageLimit: true },
    });

    if (!user) {
        return { used: 0, limit: 0, percentage: 0 };
    }

    const used = await this.getUserStorageUsage(userId);
    const limit = Number(user.storageLimit);
    
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