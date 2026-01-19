import React from 'react';

export default function TypingIndicator() {
  return (
    <div className="flex gap-4 max-w-3xl mx-auto w-full animate-pulse opacity-50">
      <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-xs flex-shrink-0">
        A
      </div>
      <div className="flex items-center gap-1 h-8">
        <div className="w-1 h-1 rounded-full bg-black"></div>
        <div className="w-1 h-1 rounded-full bg-black animation-delay-200"></div>
        <div className="w-1 h-1 rounded-full bg-black animation-delay-400"></div>
      </div>
    </div>
  );
}
