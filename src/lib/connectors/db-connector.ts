import { Pool as PgPool, Client as PgClient } from 'pg';
import mysql from 'mysql2/promise';
import { MongoClient, Db } from 'mongodb';
import neo4j, { Driver as Neo4jDriver } from 'neo4j-driver';
import Redis from 'ioredis';

export interface DBConfig {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    ssl?: boolean;
    connectionString?: string; // For JDBC-like URLs if we parse them, or just full URLs
}

export interface QueryResult {
    columns: string[];
    rows: any[];
}

export interface TableSchema {
    name: string;
    columns: ColumnSchema[];
}

export interface ColumnSchema {
    name: string;
    type: string;
    isPrimaryKey?: boolean;
    isNullable?: boolean;
    description?: string;
}

export interface DBConnector {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    execute(query: string, params?: any[]): Promise<QueryResult>;
    test(): Promise<boolean>;
    getSchema(): Promise<TableSchema[]>;
}

export class PostgresConnector implements DBConnector {
    private client: PgClient | null = null;
    private config: DBConfig;

    constructor(config: DBConfig) {
        this.config = config;
    }

    async connect() {
        if (this.client) return;
        
        const config: any = {
            host: this.config.host,
            port: this.config.port || 5432,
            user: this.config.user,
            password: this.config.password,
            database: this.config.database,
            ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined
        };

        this.client = new PgClient(config);
        await this.client.connect();
    }

    async disconnect() {
        if (this.client) {
            await this.client.end();
            this.client = null;
        }
    }

    async execute(query: string, params: any[] = []): Promise<QueryResult> {
        if (!this.client) await this.connect();
        try {
            const res = await this.client!.query(query, params);
            const columns = res.fields.map(f => f.name);
            return {
                columns,
                rows: res.rows.map(row => columns.map(col => row[col])) // Return as array of arrays for simplicity
            };
        } catch (e) {
            console.error("Postgres execution error:", e);
            throw e;
        }
    }

    async test(): Promise<boolean> {
        try {
            await this.connect();
            await this.client!.query('SELECT 1');
            return true;
        } catch (e) {
            console.error("Postgres connection test failed:", e);
            return false;
        } finally {
            await this.disconnect();
        }
    }

    async getSchema(): Promise<TableSchema[]> {
        if (!this.client) await this.connect();
        try {
            const query = `
                SELECT 
                    table_name, 
                    column_name, 
                    data_type, 
                    is_nullable,
                    (SELECT 'YES' FROM information_schema.key_column_usage kcu
                     WHERE kcu.table_name = c.table_name 
                     AND kcu.column_name = c.column_name
                     AND kcu.table_schema = c.table_schema
                     LIMIT 1) as is_primary
                FROM information_schema.columns c
                WHERE table_schema = 'public'
                ORDER BY table_name, ordinal_position;
            `;
            const res = await this.client!.query(query);
            
            const tables: Record<string, TableSchema> = {};
            
            res.rows.forEach(row => {
                if (!tables[row.table_name]) {
                    tables[row.table_name] = {
                        name: row.table_name,
                        columns: []
                    };
                }
                tables[row.table_name].columns.push({
                    name: row.column_name,
                    type: row.data_type,
                    isNullable: row.is_nullable === 'YES',
                    isPrimaryKey: row.is_primary === 'YES'
                });
            });

            return Object.values(tables);
        } catch (e) {
            console.error("Postgres getSchema error:", e);
            return [];
        }
    }
}

export class MySQLConnector implements DBConnector {
    private connection: mysql.Connection | null = null;
    private config: DBConfig;

    constructor(config: DBConfig) {
        this.config = config;
    }

    async connect() {
        if (this.connection) return;
        
        this.connection = await mysql.createConnection({
            host: this.config.host,
            port: this.config.port || 3306,
            user: this.config.user,
            password: this.config.password,
            database: this.config.database,
            ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined
        });
    }

    async disconnect() {
        if (this.connection) {
            await this.connection.end();
            this.connection = null;
        }
    }

    async execute(query: string, params: any[] = []): Promise<QueryResult> {
        if (!this.connection) await this.connect();
        try {
            // mysql2 returns [rows, fields]
            const [rows, fields] = await this.connection!.execute(query, params);
            
            // Check if rows is array
            if (Array.isArray(rows)) {
                const columns = fields ? fields.map(f => f.name) : (rows.length > 0 ? Object.keys(rows[0] as any) : []);
                // If rows are objects, convert to array of values
                const data = (rows as any[]).map(row => {
                    if (Array.isArray(row)) return row;
                    return columns.map(col => row[col]);
                });
                
                return {
                    columns,
                    rows: data
                };
            }
            
            // For non-select queries (OkPacket)
            return { columns: [], rows: [] };
        } catch (e) {
            console.error("MySQL execution error:", e);
            throw e;
        }
    }

    async test(): Promise<boolean> {
        try {
            await this.connect();
            await this.connection!.execute('SELECT 1');
            return true;
        } catch (e) {
            console.error("MySQL connection test failed:", e);
            return false;
        } finally {
            await this.disconnect();
        }
    }

    async getSchema(): Promise<TableSchema[]> {
        if (!this.connection) await this.connect();
        try {
            const query = `
                SELECT 
                    TABLE_NAME, 
                    COLUMN_NAME, 
                    DATA_TYPE, 
                    IS_NULLABLE,
                    COLUMN_KEY
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = ?
                ORDER BY TABLE_NAME, ORDINAL_POSITION;
            `;
            const [rows] = await this.connection!.execute(query, [this.config.database]);
            
            const tables: Record<string, TableSchema> = {};
            
            if (Array.isArray(rows)) {
                rows.forEach((row: any) => {
                    if (!tables[row.TABLE_NAME]) {
                        tables[row.TABLE_NAME] = {
                            name: row.TABLE_NAME,
                            columns: []
                        };
                    }
                    tables[row.TABLE_NAME].columns.push({
                        name: row.COLUMN_NAME,
                        type: row.DATA_TYPE,
                        isNullable: row.IS_NULLABLE === 'YES',
                        isPrimaryKey: row.COLUMN_KEY === 'PRI'
                    });
                });
            }

            return Object.values(tables);
        } catch (e) {
            console.error("MySQL getSchema error:", e);
            return [];
        }
    }
}

export class MongoDBConnector implements DBConnector {
    private client: MongoClient | null = null;
    private db: Db | null = null;
    private config: DBConfig;

    constructor(config: DBConfig) {
        this.config = config;
    }

    async connect() {
        if (this.client) return;
        
        const url = this.config.connectionString || `mongodb://${this.config.user && this.config.password ? `${this.config.user}:${this.config.password}@` : ''}${this.config.host || 'localhost'}:${this.config.port || 27017}`;
        this.client = await MongoClient.connect(url);
        this.db = this.client.db(this.config.database);
    }

    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
        }
    }

    async execute(query: string, params: any[] = []): Promise<QueryResult> {
        if (!this.client) await this.connect();
        try {
            // Expect query to be a JSON string defining the operation
            // e.g., { "collection": "users", "operation": "find", "filter": {}, "options": {} }
            let op: any;
            try {
                op = JSON.parse(query);
            } catch (e) {
                throw new Error("MongoDB query must be a valid JSON string, e.g., { \"collection\": \"...\", \"operation\": \"find\", \"filter\": {} }");
            }

            if (!op.collection || !op.operation) {
                throw new Error("MongoDB query must specify 'collection' and 'operation'");
            }

            const collection = this.db!.collection(op.collection);
            let result: any;

            switch (op.operation) {
                case 'find':
                    result = await collection.find(op.filter || {}, op.options).toArray();
                    break;
                case 'findOne':
                    result = await collection.findOne(op.filter || {}, op.options);
                    result = result ? [result] : [];
                    break;
                case 'insertOne':
                    result = await collection.insertOne(op.doc, op.options);
                    result = [result];
                    break;
                case 'insertMany':
                    result = await collection.insertMany(op.docs, op.options);
                    result = [result];
                    break;
                case 'updateOne':
                    result = await collection.updateOne(op.filter, op.update, op.options);
                    result = [result];
                    break;
                case 'updateMany':
                    result = await collection.updateMany(op.filter, op.update, op.options);
                    result = [result];
                    break;
                case 'deleteOne':
                    result = await collection.deleteOne(op.filter, op.options);
                    result = [result];
                    break;
                case 'deleteMany':
                    result = await collection.deleteMany(op.filter, op.options);
                    result = [result];
                    break;
                case 'aggregate':
                    result = await collection.aggregate(op.pipeline, op.options).toArray();
                    break;
                case 'countDocuments':
                    result = await collection.countDocuments(op.filter, op.options);
                    result = [{ count: result }];
                    break;
                default:
                    throw new Error(`Unsupported MongoDB operation: ${op.operation}`);
            }

            // Convert result to columns/rows
            if (Array.isArray(result) && result.length > 0) {
                // Get all unique keys from all objects
                const keys = new Set<string>();
                result.forEach(item => {
                    if (item && typeof item === 'object') {
                        Object.keys(item).forEach(k => keys.add(k));
                    } else {
                        keys.add('value');
                    }
                });
                const columns = Array.from(keys);
                const rows = result.map(item => {
                    if (item && typeof item === 'object') {
                        return columns.map(col => item[col]);
                    }
                    return [item];
                });
                return { columns, rows };
            }

            return { columns: [], rows: [] };

        } catch (e) {
            console.error("MongoDB execution error:", e);
            throw e;
        }
    }

    async test(): Promise<boolean> {
        try {
            await this.connect();
            await this.db!.command({ ping: 1 });
            return true;
        } catch (e) {
            console.error("MongoDB connection test failed:", e);
            return false;
        } finally {
            await this.disconnect();
        }
    }

    async getSchema(): Promise<TableSchema[]> {
        if (!this.client) await this.connect();
        try {
            const collections = await this.db!.listCollections().toArray();
            return collections.map(col => ({
                name: col.name,
                columns: [] // Schema is dynamic
            }));
        } catch (e) {
            console.error("MongoDB getSchema error:", e);
            return [];
        }
    }
}

export class Neo4jConnector implements DBConnector {
    private driver: Neo4jDriver | null = null;
    private config: DBConfig;

    constructor(config: DBConfig) {
        this.config = config;
    }

    async connect() {
        if (this.driver) return;
        
        const url = this.config.connectionString || `bolt://${this.config.host || 'localhost'}:${this.config.port || 7687}`;
        const auth = (this.config.user && this.config.password) 
            ? neo4j.auth.basic(this.config.user, this.config.password)
            : undefined;
            
        this.driver = neo4j.driver(url, auth);
        await this.driver.verifyConnectivity();
    }

    async disconnect() {
        if (this.driver) {
            await this.driver.close();
            this.driver = null;
        }
    }

    async execute(query: string, params: any[] = []): Promise<QueryResult> {
        if (!this.driver) await this.connect();
        
        const session = this.driver!.session({ database: this.config.database });
        try {
            // params in Neo4j should be an object, but generic interface has array.
            // If params is array and length 1 and is object, use it.
            // Otherwise, assume indexed parameters? Neo4j uses named parameters usually.
            // Let's assume the user passes a JSON string as the second argument if they want named params,
            // or we just support no params or strict array?
            // Let's assume params array is mapped to $1, $2 etc? No, Cypher uses $param.
            // Let's assume params[0] is the parameters object if it exists.
            
            const parameters = (params && params.length > 0 && typeof params[0] === 'object') ? params[0] : {};
            
            const result = await session.run(query, parameters);
            
            if (result.records.length === 0) {
                return { columns: [], rows: [] };
            }

            const columns = result.records[0].keys as string[];
            const rows = result.records.map(record => {
                return columns.map(col => {
                    const val = record.get(col);
                    // Handle Neo4j types if necessary
                    if (neo4j.isInt(val)) {
                        return val.toNumber();
                    }
                    return val;
                });
            });

            return { columns, rows };
        } catch (e) {
            console.error("Neo4j execution error:", e);
            throw e;
        } finally {
            await session.close();
        }
    }

    async test(): Promise<boolean> {
        try {
            await this.connect();
            return true;
        } catch (e) {
            console.error("Neo4j connection test failed:", e);
            return false;
        } finally {
            await this.disconnect();
        }
    }

    async getSchema(): Promise<TableSchema[]> {
        return [];
    }
}

export class RedisConnector implements DBConnector {
    private client: Redis | null = null;
    private config: DBConfig;

    constructor(config: DBConfig) {
        this.config = config;
    }

    async connect() {
        if (this.client) return;
        
        this.client = new Redis({
            host: this.config.host || 'localhost',
            port: this.config.port || 6379,
            password: this.config.password,
            db: this.config.database ? parseInt(this.config.database) : 0,
            lazyConnect: true
        });

        await this.client.connect();
    }

    async disconnect() {
        if (this.client) {
            await this.client.quit();
            this.client = null;
        }
    }

    async execute(query: string, params: any[] = []): Promise<QueryResult> {
        if (!this.client) await this.connect();
        
        try {
            let command: string;
            let args: any[];

            if (params && params.length > 0) {
                command = query;
                args = params;
            } else {
                // Split query by spaces, handling quotes could be complex but let's do simple split for now
                const parts = query.trim().split(/\s+/);
                command = parts[0];
                args = parts.slice(1);
            }

            const result = await this.client!.call(command, ...args);

            // Redis returns various types. Wrap in columns/rows.
            const columns = ['result'];
            const rows = [[typeof result === 'object' ? JSON.stringify(result) : result]];

            return { columns, rows };
        } catch (e) {
            console.error("Redis execution error:", e);
            throw e;
        }
    }

    async test(): Promise<boolean> {
        try {
            await this.connect();
            await this.client!.ping();
            return true;
        } catch (e) {
            console.error("Redis connection test failed:", e);
            return false;
        } finally {
            await this.disconnect();
        }
    }

    async getSchema(): Promise<TableSchema[]> {
        return [];
    }
}

export class ConnectorFactory {
    static getConnector(type: string, config: DBConfig): DBConnector {
        switch (type.toLowerCase()) {
            case 'postgres':
            case 'postgresql':
                return new PostgresConnector(config);
            case 'mysql':
            case 'mariadb':
            case 'tidb':
                return new MySQLConnector(config);
            case 'mongodb':
            case 'mongo':
                return new MongoDBConnector(config);
            case 'neo4j':
            case 'graph':
                return new Neo4jConnector(config);
            case 'redis':
                return new RedisConnector(config);
            default:
                throw new Error(`Unsupported database type: ${type}`);
        }
    }
}
