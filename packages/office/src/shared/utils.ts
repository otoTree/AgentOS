/**
 * Converts a column index (0-based) to an Excel column letter (e.g., 0 -> A, 25 -> Z, 26 -> AA).
 */
export function indexToColumn(index: number): string {
  let temp = index;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Converts an Excel column letter to a 0-based index (e.g., A -> 0, Z -> 25, AA -> 26).
 */
export function columnToIndex(column: string): number {
  let result = 0;
  for (let i = 0; i < column.length; i++) {
    result *= 26;
    result += column.charCodeAt(i) - 64;
  }
  return result - 1;
}

/**
 * Converts 0-based row and column indices to an A1-style cell reference (e.g., 0,0 -> A1).
 */
export function cellToIndex(row: number, col: number): string {
  return `${indexToColumn(col)}${row + 1}`;
}

/**
 * Converts an A1-style cell reference to 0-based row and column indices.
 */
export function indexToCell(cell: string): { row: number; col: number } {
  const match = cell.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid cell reference: ${cell}`);
  }
  const colStr = match[1];
  const rowStr = match[2];
  return {
    col: columnToIndex(colStr),
    row: parseInt(rowStr, 10) - 1,
  };
}
