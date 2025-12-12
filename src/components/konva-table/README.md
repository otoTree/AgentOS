# Konva Table Component with OSS Persistence

This component provides an Excel-like interface with support for multiple workbooks and sheets, integrated with S3-compatible object storage.

## Features

- **Multi-Workbook Support**: Create, open, and manage multiple Excel-like files (workbooks).
- **Multi-Sheet Support**: Each workbook can contain multiple sheets.
- **Persistence**: Data is stored in S3 (AWS, MinIO, etc.) using the system configuration.
- **Auto-Save**: Changes are automatically saved after 5 seconds of inactivity.
- **Performance**: 
  - Lazy loading of workbook content (only metadata is loaded initially).
  - Efficient canvas rendering using Konva.

## Configuration

The component uses the global system configuration located at `src/lib/infra/config.ts`. Ensure the `s3` section is properly configured:

```typescript
// src/lib/infra/config.ts
export const systemConfig = {
  // ...
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    bucketName: process.env.S3_BUCKET_NAME || 'sandbox',
    region: process.env.S3_REGION || 'us-east-1',
    // ...
  },
  // ...
};
```

## API / Server Actions

The persistence logic is handled by server actions in `src/app/excel-actions.ts`:

- `listWorkbooks()`: Returns a list of available workbooks (metadata only).
- `loadWorkbook(id)`: Loads the full content of a specific workbook.
- `saveWorkbookToOss(workbook)`: Saves the workbook content and updates the manifest.
- `deleteWorkbookFromOss(id)`: Deletes a workbook and removes it from the manifest.

## Usage

```tsx
import { TableManager } from '@/components/konva-table/TableManager';

export default function ExcelPage() {
  return (
    <div className="h-screen w-screen">
      <TableManager />
    </div>
  );
}
```

## Data Structure

**Workbook**:
```typescript
interface Workbook {
  id: string;
  name: string;
  sheets: Sheet[];
  activeSheetId: string | null;
  lastModified?: number;
}
```

**Sheet**:
```typescript
interface Sheet {
  id: string;
  name: string;
  data: GridData; // CellValue[][]
}
```

## Storage Structure (S3)

- `excel-tables/manifest.json`: Index of all workbooks (id, name, lastModified).
- `excel-tables/{id}.json`: Actual workbook content.
