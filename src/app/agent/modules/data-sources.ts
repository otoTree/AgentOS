'use server'

import { auth } from "@/auth";
import { dataSourceRepository, dataSourceTableRepository, dataSourceColumnRepository } from "@/lib/repositories/datasource-repository";
import { ConnectorFactory, DBConfig } from "@/lib/connectors/db-connector";
import OpenAI from 'openai';
import { systemConfig } from "@/lib/infra/config";

export async function getDataSources(userIdOverride?: string) {
    let userId = userIdOverride;
    if (!userId) {
        const session = await auth();
        userId = session?.user?.id;
    }
    if (!userId) throw new Error("Unauthorized");
    
    return dataSourceRepository.findByUserId(userId);
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
        // Verify ownership
        const existing = await dataSourceRepository.findById(data.id);
        if (!existing || existing.userId !== session.user.id) {
            throw new Error("Data source not found or unauthorized");
        }

        return dataSourceRepository.update(data.id, {
            name: data.name,
            type: data.type,
            config: data.config
        });
    } else {
        const newSource = await dataSourceRepository.create({
            name: data.name,
            type: data.type,
            config: data.config,
            userId: session.user.id
        });
        
        // Auto-sync schema for new source
        try {
            await syncDataSourceSchema(newSource.id);
        } catch (e) {
            console.error("Initial schema sync failed:", e);
        }
        
        return newSource;
    }
}

export async function syncDataSourceSchema(dataSourceId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const dataSource = await dataSourceRepository.findById(dataSourceId);

    if (!dataSource || dataSource.userId !== session.user.id) throw new Error("Data source not found");

    const config = dataSource.config as unknown as DBConfig;
    const connector = ConnectorFactory.getConnector(dataSource.type, config);

    try {
        await connector.connect();
        const schema = await connector.getSchema();
        await connector.disconnect();
        
        for (const table of schema) {
            // Find existing table or create
            let dbTable = await dataSourceTableRepository.findByName(dataSource.id, table.name);
            
            if (!dbTable) {
                dbTable = await dataSourceTableRepository.create({
                    name: table.name,
                    dataSourceId: dataSource.id
                });
            }

            for (const col of table.columns) {
                const existingCol = await dataSourceColumnRepository.findByName(dbTable.id, col.name);
                
                if (existingCol) {
                    await dataSourceColumnRepository.update(existingCol.id, {
                        type: col.type,
                        isPrimaryKey: col.isPrimaryKey || false,
                        isNullable: col.isNullable || true
                    });
                } else {
                    await dataSourceColumnRepository.create({
                        name: col.name,
                        type: col.type,
                        isPrimaryKey: col.isPrimaryKey || false,
                        isNullable: col.isNullable || true,
                        tableId: dbTable.id
                    });
                }
            }
        }
        
        return { success: true };
    } catch (e: any) {
        console.error("Sync schema failed:", e);
        try { await connector.disconnect(); } catch { /* ignore */ }
        return { success: false, error: e.message };
    }
}

export async function getDataSourceSchema(dataSourceId: string, userIdOverride?: string) {
    let userId = userIdOverride;
    if (!userId) {
        const session = await auth();
        userId = session?.user?.id;
    }
    if (!userId) throw new Error("Unauthorized");

    // Verify ownership
    const dataSource = await dataSourceRepository.findById(dataSourceId);

    if (!dataSource || dataSource.userId !== userId) throw new Error("Data source not found or unauthorized");

    const tables = await dataSourceTableRepository.findByDataSourceId(dataSourceId);
    
    // Enrich with columns (N+1 but limited scope for MVP)
    const tablesWithColumns = await Promise.all(tables.map(async (table) => {
        const columns = await dataSourceColumnRepository.findByTableId(table.id);
        return {
            ...table,
            columns
        };
    }));
    
    return tablesWithColumns.sort((a, b) => a.name.localeCompare(b.name));
}

export async function updateColumnDescription(columnId: string, description: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    
    const column = await dataSourceColumnRepository.findById(columnId);
    if (!column) throw new Error("Column not found");
    
    const table = await dataSourceTableRepository.findById(column.tableId);
    if (!table) throw new Error("Table not found");
    
    const dataSource = await dataSourceRepository.findById(table.dataSourceId);
    
    if (!dataSource || dataSource.userId !== session.user.id) {
        throw new Error("Unauthorized or column not found");
    }

    return dataSourceColumnRepository.update(columnId, { description });
}

export async function deleteDataSource(id: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const dataSource = await dataSourceRepository.findById(id);
    if (!dataSource || dataSource.userId !== session.user.id) throw new Error("Unauthorized");

    return dataSourceRepository.delete(id);
}

export async function testConnection(type: string, config: DBConfig) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    
    try {
        const connector = ConnectorFactory.getConnector(type, config);
        const success = await connector.test();
        return { success, message: success ? 'Connection successful' : 'Connection failed' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function executeQuery(dataSourceId: string, query: string, userIdOverride?: string) {
    let userId = userIdOverride;
    if (!userId) {
        const session = await auth();
        userId = session?.user?.id;
    }
    if (!userId) throw new Error("Unauthorized");

    const dataSource = await dataSourceRepository.findById(dataSourceId);

    if (!dataSource || dataSource.userId !== userId) throw new Error("Data source not found");

    const config = dataSource.config as unknown as DBConfig;
    const connector = ConnectorFactory.getConnector(dataSource.type, config);

    try {
        await connector.connect();
        const result = await connector.execute(query);
        await connector.disconnect();
        return { success: true, data: result };
    } catch (e: any) {
        try { await connector.disconnect(); } catch { /* ignore */ }
        return { success: false, error: e.message };
    }
}

export async function executeNaturalLanguageQuery(dataSourceId: string, prompt: string, userIdOverride?: string) {
    let userId = userIdOverride;
    if (!userId) {
        const session = await auth();
        userId = session?.user?.id;
    }
    if (!userId) throw new Error("Unauthorized");

    const dataSource = await dataSourceRepository.findById(dataSourceId);

    if (!dataSource || dataSource.userId !== userId) throw new Error("Data source not found");

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
