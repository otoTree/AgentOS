import { FileExplorer } from "./file-explorer";

export default function FilesPage({ searchParams }: { searchParams: { search?: string } }) {
  return (
    <div className="container max-w-6xl py-6 mx-auto px-6 h-full flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Space</h1>
      <FileExplorer initialSearch={searchParams.search} />
    </div>
  );
}