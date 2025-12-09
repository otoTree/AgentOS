import { prisma } from "@/lib/infra/prisma";
import { FileStorage } from "@/lib/storage/file-storage";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const share = await prisma.fileShare.findUnique({
    where: { token: params.token },
    include: { file: true },
  });

  if (!share || !share.file) {
    return { title: "File Not Found" };
  }

  return {
    title: `${share.file.name} - Shared File`,
  };
}

export default async function SharedFilePage({ params }: { params: { token: string } }) {
  const share = await prisma.fileShare.findUnique({
    where: { token: params.token },
    include: { file: true },
  });

  if (!share || !share.file) {
    notFound();
  }

  const file = share.file;
  // Use Public Proxy URL
  const url = `/api/share/${params.token}/download`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/10 p-4">
      <div className="bg-card p-8 rounded-lg shadow-lg max-w-4xl w-full flex flex-col gap-6">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
             <h1 className="text-2xl font-bold">{file.name}</h1>
             <p className="text-sm text-muted-foreground">
               Shared via Sandbox • {(file.size / 1024).toFixed(1)} KB • {new Date(file.updatedAt).toLocaleDateString()}
             </p>
          </div>
          <a 
            href={url} 
            download 
            className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
          >
            Download
          </a>
        </div>

        <div className="flex-1 min-h-[500px] flex items-center justify-center bg-muted/5 rounded overflow-hidden border relative">
          <PreviewContent file={file} url={url} />
        </div>
      </div>
    </div>
  );
}

function PreviewContent({ file, url }: { file: any; url: string }) {
  if (file.mimeType.startsWith("image/")) {
    return <img src={url} alt={file.name} className="max-w-full max-h-full object-contain" />;
  }
  
  if (file.mimeType === "application/pdf") {
    return <iframe src={url} className="w-full h-full border-none" />;
  }

  if (file.mimeType.startsWith("text/") || file.mimeType === "application/json" || file.mimeType.includes("javascript") || file.mimeType.includes("xml")) {
    return <iframe src={url} className="w-full h-full border-none bg-white" />;
  }

  return (
    <div className="text-center">
      <p className="mb-4 text-lg font-medium">Preview not available</p>
      <p className="text-muted-foreground">This file type cannot be previewed in the browser.</p>
    </div>
  );
}