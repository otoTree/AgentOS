// @ts-ignore
import { Electroview } from "electrobun/view";
import { AgentRPCSchema } from "../types/rpc";
import { useChatStore } from "./store/useChatStore";
import { useSkillChatStore } from "./store/useSkillChatStore";
import { useSkillEditorStore } from "./store/useSkillEditorStore";

const rpcSchema = Electroview.defineRPC<AgentRPCSchema>({
  maxRequestTime: 120000,
  handlers: {
    requests: {},
    messages: {
        chunk: ({ content }: { content: string }) => {
            console.log("Received chunk:", content);
            // 暂时打印日志，未来可以接入 store
        },
        tool_start: ({ sessionId, name, args }: { sessionId?: string, name: string, args: any }) => {
            console.log("Tool start:", name, args, sessionId);
            
            const skillSessionId = useSkillChatStore.getState().sessionId;
            if (sessionId && skillSessionId && sessionId === skillSessionId) {
                useSkillChatStore.getState().handleToolStart(name, args);
                return;
            }

            useChatStore.getState().handleToolStart(name, args);
        },
        tool_end: ({ sessionId, name, output }: { sessionId?: string, name: string, output: any }) => {
            console.log("Tool end:", name, output, sessionId);
            
            // Always notify SkillEditorStore about tool events if it might be relevant
            // The store itself will decide whether to refresh based on its state (e.g. if a skill is open)
            if (sessionId) {
                useSkillEditorStore.getState().handleRpcToolEvent(sessionId, name);
            }
            
            const skillSessionId = useSkillChatStore.getState().sessionId;
            if (sessionId && skillSessionId && sessionId === skillSessionId) {
                useSkillChatStore.getState().handleToolEnd(name, output);
                return;
            }

            useChatStore.getState().handleToolEnd(name, output);
        }
    }
  }
});

type RpcClient = typeof rpcSchema;

let electroviewInstance: Electroview<RpcClient> | null = null;
let rpcReadyResolve: ((rpc: RpcClient) => void) | null = null;
const rpcReadyPromise = new Promise<RpcClient>((resolve) => {
  rpcReadyResolve = resolve;
});

export const initElectroview = () => {
  if (electroviewInstance) {
    console.log("[RPC] Electroview already initialized");
    return electroviewInstance;
  }
  console.log("[RPC] Initializing Electroview");
  electroviewInstance = new Electroview<RpcClient>({ rpc: rpcSchema });
  if (rpcReadyResolve) {
    console.log("[RPC] Resolving RPC client");
    rpcReadyResolve(electroviewInstance.rpc as RpcClient);
    rpcReadyResolve = null;
  }
  return electroviewInstance;
};

export const getRpc = () => {
  if (electroviewInstance) {
    console.log("[RPC] getRpc immediate");
    return Promise.resolve(electroviewInstance.rpc as RpcClient);
  }
  console.log("[RPC] getRpc waiting for initialization");
  return rpcReadyPromise;
};
