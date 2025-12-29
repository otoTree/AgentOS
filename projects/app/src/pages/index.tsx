import React from 'react';
import { DEFAULT_CONFIG } from '@agentos/global';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-6xl font-bold">
        Welcome to {DEFAULT_CONFIG.name}
      </h1>
      <p className="mt-3 text-2xl">
        Version {DEFAULT_CONFIG.version}
      </p>
    </div>
  );
}
