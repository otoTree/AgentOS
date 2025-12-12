"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function SearchBar({ initialSearch, onSearch, placeholder }: { initialSearch?: string, onSearch?: (val: string) => void, placeholder?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
        onSearch(search);
    } else {
        startTransition(() => {
          if (search) {
            router.push(`/dashboard/files?search=${encodeURIComponent(search)}`);
          } else {
            router.push("/dashboard/files");
          }
        });
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex gap-2">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder || "Search content..."}
        className="flex-1 p-2 border rounded bg-background"
      />
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? "Searching..." : "Search"}
      </button>
    </form>
  );
}