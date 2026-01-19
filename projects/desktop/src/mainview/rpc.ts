// @ts-ignore
import { Electroview } from "electrobun/view";
import { AgentRPCSchema } from "../types/rpc";

const rpcSchema = Electroview.defineRPC<AgentRPCSchema>({
  maxRequestTime: 120000,
  handlers: {
    requests: {},
    messages: {
        chunk: ({ content }: { content: string }) => {
            console.log("Received chunk:", content);
            // 暂时打印日志，未来可以接入 store
        },
        tool_start: ({ name, args }: { name: string, args: any }) => {
            console.log("Tool start:", name, args);
        },
        tool_end: ({ name, output }: { name: string, output: any }) => {
            console.log("Tool end:", name, output);
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
