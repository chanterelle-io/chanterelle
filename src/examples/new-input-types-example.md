# New Input Types - Usage Examples

This document shows how to use the new textarea and file input types that have been added to the ModelInputField component.

## Textarea Input

For multi-line text input, use type "textarea":

```json
{
  "name": "description",
  "label": "Description",
  "type": "textarea",
  "required": true,
  "description": "Enter a detailed description",
  "constraints": {
    "rows": 6,
    "placeholder": "Enter your description here..."
  }
}
```

### Available Constraints:
- `rows`: Number of textarea rows (default: 4)
- `placeholder`: Placeholder text

## File Input

For file uploads, use type "file":

```json
{
  "name": "document",
  "label": "Upload Document",
  "type": "file",
  "required": true,
  "description": "Upload a document file",
  "constraints": {
    "extensions": ["pdf", "doc", "docx"],
    "multiple": false
  }
}
```

### Available Constraints:
- `extensions`: Array of allowed file extensions (e.g., `["pdf", "doc", "docx"]`, `["jpg", "png", "gif"]`)
- `multiple`: Whether to allow multiple file selection (boolean)

### Multiple Files Example:

```json
{
  "name": "images",
  "label": "Upload Images",
  "type": "file",
  "required": false,
  "description": "Upload multiple image files",
  "constraints": {
    "extensions": ["jpg", "png", "gif", "jpeg"],
    "multiple": true
  }
}
```

## Important Notes for File Handling

⚠️ **Current Implementation**: Files are currently passed as File objects to the form submission. This works for client-side validation but **requires backend integration** for actual file processing.

### For Production Use:

1. **File Upload**: Implement a separate file upload endpoint
2. **Temporary Storage**: Store uploaded files in a temporary location
3. **Reference**: Pass file IDs/paths instead of File objects to the model
4. **Security**: Validate file types and sizes on the server
5. **Cleanup**: Remove temporary files after processing

### Backend Integration Needed:

The current implementation includes placeholder logic in `ModelForm.tsx` that creates file metadata objects:

```typescript
// This needs proper backend integration
parsedValues[input.name] = {
  name: fileValue.name,
  size: fileValue.size,
  type: fileValue.type,
  data: fileValue // Won't serialize properly over Tauri invoke
};
```

Consider implementing:
- File upload to temp directory via Tauri filesystem API
- File processing in Python handler
- File path passing instead of File objects
