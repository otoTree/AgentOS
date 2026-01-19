import React from 'react';

export default function StorageSection() {
  return (
    <section>
      <h3 className="text-sm font-semibold text-black/90 mb-4 pb-2 border-b border-border">Storage</h3>
      <div className="flex items-center gap-4">
        <div className="flex-1 bg-white border border-border rounded-xl p-4 shadow-sm">
          <div className="text-[11px] text-black/50 mb-1">Vector DB</div>
          <div className="text-xl font-bold">128 MB</div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-indigo-500 h-full w-[15%]"></div>
          </div>
        </div>
        <div className="flex-1 bg-white border border-border rounded-xl p-4 shadow-sm">
          <div className="text-[11px] text-black/50 mb-1">Cache</div>
          <div className="text-xl font-bold">45 MB</div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-amber-500 h-full w-[5%]"></div>
          </div>
        </div>
        <button className="px-4 py-2 border border-border rounded-xl hover:bg-gray-50 transition-colors text-[12px] font-medium text-destructive">
          Clear Data
        </button>
      </div>
    </section>
  );
}
