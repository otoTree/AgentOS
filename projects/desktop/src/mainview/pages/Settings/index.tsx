import React from 'react';
import GeneralSection from '../../../components/settings/GeneralSection';
import AIModelsSection from '../../../components/settings/AIModelsSection';
import StorageSection from '../../../components/settings/StorageSection';

export default function SettingsPage() {
  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto animate-slide-in">
        <div className="max-w-2xl mx-auto w-full space-y-8">
            <GeneralSection />
            <AIModelsSection />
            <StorageSection />
            
            <div className="pt-8 text-center">
                <p className="text-[11px] text-black/30">AgentOS Desktop v0.1.0-alpha</p>
            </div>
        </div>
    </div>
  );
}
