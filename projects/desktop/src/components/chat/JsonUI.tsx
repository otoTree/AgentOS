import React from 'react';

type JsonUIProps = {
  data: any;
};

export default function JsonUI({ data }: JsonUIProps) {
  // Simple rendering of JSON data. 
  // In a real app, we might have different renderers based on the data type.
  return (
    <div className="text-[13px]">
      {typeof data === 'object' && data !== null ? (
        <pre className="bg-gray-50 p-2 rounded border border-black/5 overflow-x-auto font-mono text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : (
        <p>{String(data)}</p>
      )}
    </div>
  );
}
