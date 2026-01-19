import React from 'react';

export default function GeneralSection() {
  return (
    <section>
      <h3 className="text-sm font-semibold text-black/90 mb-4 pb-2 border-b border-border">General</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="block font-medium text-black">Appearance</label>
            <p className="text-[12px] text-black/50">Customize the look and feel.</p>
          </div>
          <select className="bg-white border border-black/10 rounded-lg px-2 py-1 text-[12px] focus:outline-none focus:border-black/30 shadow-sm cursor-default">
            <option>System Default</option>
            <option>Light</option>
            <option>Dark</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <label className="block font-medium text-black">Startup</label>
            <p className="text-[12px] text-black/50">Launch AgentOS on system startup.</p>
          </div>
          <button className="w-10 h-5 bg-black rounded-full relative cursor-default">
            <span className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></span>
          </button>
        </div>
      </div>
    </section>
  );
}
