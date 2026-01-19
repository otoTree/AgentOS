// @ts-ignore
import { Electroview } from "electrobun/view";
import { AgentRPCSchema } from "../types/rpc";

export const rpc = Electroview.defineRPC<AgentRPCSchema>({
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
