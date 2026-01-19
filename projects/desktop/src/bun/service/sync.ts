import { localDB } from "../db";
import { ApiClient } from "../api";

export class SyncService {
  private apiClient: ApiClient;
  private isSyncing: boolean = false;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  start() {
    // 启动定时同步任务
    setInterval(() => this.sync(), 5000); // 每5秒同步一次
  }

  async sync() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const messages = localDB.getUnsyncedMessages();
      if (messages.length === 0) {
        this.isSyncing = false;
        return;
      }

      console.log(`[SyncService] Found ${messages.length} unsynced messages`);

      for (const msg of messages) {
        try {
          // 这里假设 ApiClient 有一个方法来保存消息
          // 如果没有，可能需要调用 chatSessionsMessageCreate 之类的
          // 目前 api.ts 里没有直接保存消息的接口，只有 chatCompletion
          // 我们可以假设有一个 /chat/sessions/:id/messages 的 POST 接口
          // 或者如果这是一个新会话，我们可能需要先创建会话
          
          // 暂时模拟同步成功，或者如果 ApiClient 有相应方法则调用
          // await this.apiClient.createMessage(msg.session_id, msg);
          
          // TODO: 实现真正的 API 调用
          // await this.apiClient.requestJson(`/chat/sessions/${msg.session_id}/messages`, {
          //   method: 'POST',
          //   body: {
          //     role: msg.role,
          //     content: msg.content,
          //     id: msg.id // 如果后端支持幂等
          //   }
          // });

          localDB.markSynced(msg.id);
          console.log(`[SyncService] Synced message ${msg.id}`);
        } catch (error) {
          console.error(`[SyncService] Failed to sync message ${msg.id}`, error);
          // 遇到错误暂停本次同步循环，等待下一次
          break;
        }
      }
    } catch (error) {
      console.error("[SyncService] Sync error:", error);
    } finally {
      this.isSyncing = false;
    }
  }
}
