export class FormulaParser {
    // Regex for parsing formulas
    // Simplistic parser for MVP: supports functions (SUM, AVG) and cell ranges (A1:B2) or single cells (A1)
    
    static isFormula(value: string): boolean {
        return value.startsWith('=');
    }

    static parse(formula: string): { functionName: string, args: string[] } | null {
        // Remove '='
        const content = formula.substring(1).trim();
        
        // Match FUNCTION(ARGS)
        const match = content.match(/^([A-Z]+)\((.*)\)$/);
        if (match) {
            return {
                functionName: match[1],
                args: match[2].split(',').map(arg => arg.trim())
            };
        }
        return null;
    }
}
