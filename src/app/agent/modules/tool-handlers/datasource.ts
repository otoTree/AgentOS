import {
  getDataSources,
  executeNaturalLanguageQuery,
  getDataSourceSchema
} from "../data-sources";

export async function handleDataSourceTool(call: any, userId: string) {
    if (call.name === 'datasource_list') {
        try {
            const sources = await getDataSources(userId);
            if (sources.length === 0) {
                return "No data sources found. You can add data sources in the Data Source settings.";
            }
            return "Data Sources:\n" + 
                sources.map((s: any) => `- ${s.name} (ID: ${s.id}, Type: ${s.type})`).join('\n');
        } catch (e: any) {
            return "Error listing data sources: " + e.message;
        }
    }

    if (call.name === 'datasource_query') {
        try {
            const { dataSourceId, query } = call.arguments;
            if (!dataSourceId || !query) {
                return "Error: dataSourceId and query are required.";
            }

            const result = await executeNaturalLanguageQuery(dataSourceId, query, userId);
            
            if (result.success) {
                let output = `Generated Query: ${result.generatedQuery}\n\nResult:\n`;
                if (Array.isArray(result.data) && result.data.length > 0) {
                    // Format as JSON or Table? JSON is probably safer for LLM to consume
                    output += JSON.stringify(result.data, null, 2);
                } else if (Array.isArray(result.data) && result.data.length === 0) {
                    output += "No results found.";
                } else {
                    output += JSON.stringify(result.data, null, 2);
                }
                return output;
            } else {
                return "Error executing query: " + result.error;
            }
        } catch (e: any) {
            return "Error executing query: " + e.message;
        }
    }

    if (call.name === 'datasource_schema') {
        try {
            const { dataSourceId } = call.arguments;
            if (!dataSourceId) {
                return "Error: dataSourceId is required.";
            }

            const tables = await getDataSourceSchema(dataSourceId, userId);
            
            let schemaOutput = `Schema for Data Source ${dataSourceId}:\n\n`;
            for (const table of tables) {
                schemaOutput += `Table: ${table.name}\n`;
                // @ts-ignore
                if (table.columns && table.columns.length > 0) {
                    // @ts-ignore
                    schemaOutput += table.columns.map(c => 
                        `  - ${c.name} (${c.type})${c.isPrimaryKey ? ' [PK]' : ''}`
                    ).join('\n');
                }
                schemaOutput += "\n\n";
            }
            
            return schemaOutput;
        } catch (e: any) {
            return "Error getting schema: " + e.message;
        }
    }

    return null;
}
