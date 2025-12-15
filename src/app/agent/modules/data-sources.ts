'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/infra/prisma";
import { ConnectorFactory, DBConfig } from "@/lib/connectors/db-connector";
import OpenAI from 'openai';
import { systemConfig } from "@/lib/infra/config";

export async function getDataSources() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    
    return prisma.dataSource.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' }
    });
}

export async function saveDataSource(data: {
    id?: string;
    name: string;
    type: string;
    config: DBConfig;
}) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    if (data.id) {
        return prisma.dataSource.update({
            where: { id: data.id, userId: session.user.id },
            data: {
                name: data.name,
                type: data.type,
                config: data.config as any
            }
        });
    } else {
        return prisma.dataSource.create({
            data: {
                name: data.name,
                type: data.type,
                config: data.config as any,
                userId: session.user.id
            }
        });
    }
}

export async function deleteDataSource(id: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    return prisma.dataSource.delete({
        where: { id, userId: session.user.id }
    });
}

export async function testConnection(type: string, config: DBConfig) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    
    // Safety check: Don't allow connecting to localhost in production unless intended
    // For local desktop app, localhost is fine.

    try {
        const connector = ConnectorFactory.getConnector(type, config);
        const success = await connector.test();
        return { success, message: success ? 'Connection successful' : 'Connection failed' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function executeQuery(dataSourceId: string, query: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const dataSource = await prisma.dataSource.findUnique({
        where: { id: dataSourceId, userId: session.user.id }
    });

    if (!dataSource) throw new Error("Data source not found");

    const config = dataSource.config as unknown as DBConfig;
    const connector = ConnectorFactory.getConnector(dataSource.type, config);

    try {
        await connector.connect();
        const result = await connector.execute(query);
        await connector.disconnect();
        return { success: true, data: result };
    } catch (e: any) {
        try { await connector.disconnect(); } catch {}
        return { success: false, error: e.message };
    }
}

export async function executeNaturalLanguageQuery(dataSourceId: string, prompt: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const dataSource = await prisma.dataSource.findUnique({
        where: { id: dataSourceId, userId: session.user.id }
    });

    if (!dataSource) throw new Error("Data source not found");

    const apiKey = systemConfig.openai.apiKey;
    const baseUrl = systemConfig.openai.baseUrl;
    const model = systemConfig.openai.model || "gpt-4o";

    if (!apiKey) {
        throw new Error("OpenAI API Key is not configured.");
    }

    const openai = new OpenAI({
        baseURL: baseUrl || undefined,
        apiKey: apiKey,
    });

    const type = dataSource.type.toLowerCase();
    let systemPrompt = `You are a database expert. Your goal is to translate a natural language request into a valid database query/command for a ${type} database.
Return ONLY the query string, without markdown code blocks or explanations.`;

    if (type.includes('mongo')) {
        systemPrompt += `
For MongoDB, return a valid JSON string representing the operation.
Format: { "collection": "...", "operation": "find", "filter": {}, "options": {} }
Supported operations: find, findOne, insertOne, insertMany, updateOne, updateMany, deleteOne, deleteMany, aggregate, countDocuments.
Example: { "collection": "users", "operation": "find", "filter": { "age": { "$gt": 18 } } }`;
    } else if (type.includes('neo4j') || type.includes('graph')) {
        systemPrompt += `
For Neo4j, return a valid Cypher query.
Example: MATCH (n:Person) WHERE n.age > 18 RETURN n`;
    } else if (type.includes('redis')) {
        systemPrompt += `
For Redis, return the command string.
Example: SET user:100 "Alice"
Example: GET user:100`;
    } else {
        systemPrompt += `
For SQL (Postgres, MySQL, etc.), return a valid SQL query.
Example: SELECT * FROM users WHERE age > 18 LIMIT 10;`;
    }

    try {
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            model: model,
        });

        let query = completion.choices[0]?.message.content?.trim() || "";
        
        // Clean up markdown code blocks if present
        query = query.replace(/^```(json|sql|cypher|bash)?\s*/, "").replace(/\s*```$/, "");

        const config = dataSource.config as unknown as DBConfig;
        const connector = ConnectorFactory.getConnector(dataSource.type, config);

        await connector.connect();
        const result = await connector.execute(query);
        await connector.disconnect();

        return { success: true, data: result, generatedQuery: query };

    } catch (e: any) {
        console.error("NL Query Execution Failed:", e);
        return { success: false, error: e.message };
    }
}

