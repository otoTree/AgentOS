import mammoth from "mammoth";
import chardet from "chardet";
import iconv from "iconv-lite";

export async function extractText(buffer: Buffer, mimeType: string): Promise<string | null> {
  try {
    if (mimeType === "application/pdf") {
      // Dynamic require to avoid build-time bundling issues with pdf-parse in Next.js
      // @ts-ignore
      const pdf = (await import("pdf-parse")).default;
      const data = await pdf(buffer);
      return data.text;
    } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      try {
          // Use arrayBuffer if available, otherwise pass buffer directly
          // Mammoth expects a buffer or arrayBuffer. Node Buffer works fine.
          const result = await mammoth.extractRawText({ buffer });
          return result.value;
      } catch (mammothError) {
          console.warn("Mammoth extraction failed, trying fallback text extraction:", mammothError);
          // Fallback: Try to detect encoding and decode as text directly
          // This helps if it's actually a text file mislabeled as docx or a very simple doc/xml
          const encoding = chardet.detect(buffer);
          if (encoding && iconv.encodingExists(encoding)) {
              return iconv.decode(buffer, encoding);
          }
          return buffer.toString("utf-8");
      }
    } else if (mimeType.startsWith("text/") || mimeType === "application/json" || mimeType === "application/javascript") {
      // Detect encoding
      const encoding = chardet.detect(buffer);
      
      // Decode using detected encoding or default to utf-8
      if (encoding && iconv.encodingExists(encoding)) {
          return iconv.decode(buffer, encoding);
      }
      return buffer.toString("utf-8");
    }
    return null;
  } catch (error) {
    console.error("Text extraction failed:", error);
    return null;
  }
}