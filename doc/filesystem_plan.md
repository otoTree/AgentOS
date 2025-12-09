# Mac-like File System & API Access Plan

## 1. Database Schema Updates

We need to introduce a hierarchy for files. A `Folder` model will be created, and `File` will be updated to reference it.

```prisma
model Folder {
  id          String   @id @default(cuid())
  name        String
  parentId    String?
  parent      Folder?  @relation("FolderHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children    Folder[] @relation("FolderHierarchy")
  
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  files       File[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([parentId])
  @@unique([userId, parentId, name]) // Prevent duplicate folder names in same directory
}

// Update existing File model
model File {
  // ... existing fields
  folderId    String?
  folder      Folder?  @relation(fields: [folderId], references: [id], onDelete: Cascade)
  
  // ... existing relations
  @@index([folderId])
}
```

## 2. API Architecture

All endpoints will support both Session-based (Web UI) and Token-based (API) authentication via `getAuthenticatedUser()`.

### New Endpoints
- `GET /api/folders`: List folders (support `parentId` query param)
- `POST /api/folders`: Create folder
- `PATCH /api/folders/[id]`: Rename/Move folder
- `DELETE /api/folders/[id]`: Delete folder (recursive)

### Updated Endpoints
- `GET /api/files`: Add `folderId` query param.
- `PATCH /api/files/[id]`: New endpoint for Rename/Move operations.
- `POST /api/files`: Support `folderId` in form data.

### Authentication
- We will reuse the existing `ApiToken` model.
- We need a UI to manage these tokens in `SettingsDialog`.

## 3. UI/UX Design (Mac-like Experience)

The file explorer will be rebuilt with the following components:

### A. Navigation Bar
- Breadcrumbs for current path (e.g., `Home > Projects > Images`)
- Back/Forward history buttons
- View Toggle (Icon Grid vs. Detail List)
- Search Bar (Global search)

### B. Sidebar (Optional but Mac-like)
- Quick Links: "All Files", "Shared", "Recent"

### C. Main Content Area
- **Icon View**: Large icons, grid layout. Double-click to enter folder.
- **List View**: Table with columns (Name, Size, Date, Type). Sortable headers.
- **Drag & Drop**: Support dragging files into folders.

### D. Context Menu (Right-click)
- Rename
- Move to...
- Share
- Download
- Delete
- Get Info

## 4. Implementation Steps

1.  **Database Migration**: Add `Folder` model and update `File` model.
2.  **Backend Logic**: Implement CRUD for folders and update file operations.
3.  **API Token UI**: Add "API Tokens" tab to `SettingsDialog` to generate/list/revoke tokens.
4.  **Frontend State**: Create a context or hook to manage `currentFolderId`, `viewMode`, `selection`.
5.  **Frontend Components**: Build `FolderItem`, `FileItem`, `Breadcrumbs`, `FileList`, `FileGrid`.
6.  **Integration**: Connect UI to new API endpoints.
