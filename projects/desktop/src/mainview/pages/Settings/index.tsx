import React from 'react';
import GeneralSection from '../../../components/settings/GeneralSection';
import AIModelsSection from '../../../components/settings/AIModelsSection';
import StorageSection from '../../../components/settings/StorageSection';
import { useAuthStore } from '../../store/useAuthStore';

export default function SettingsPage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto animate-slide-in">
        <div className="max-w-2xl mx-auto w-full space-y-8">
            <GeneralSection />
            <AIModelsSection />
            <StorageSection />

            <section>
              <h3 className="text-sm font-semibold text-black/90 mb-4 pb-2 border-b border-border">Account</h3>
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-lg font-bold text-black/40">
                     {user?.name?.[0]?.toUpperCase() || 'U'}
                   </div>
                   <div>
                     <div className="font-medium text-black">{user?.name || 'User'}</div>
                     <div className="text-[12px] text-black/50">{user?.email}</div>
                   </div>
                </div>
                <button 
                  onClick={logout}
                  className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors border border-red-200 cursor-pointer"
                >
                  Log out
                </button>
              </div>
            </section>
            
            <div className="pt-8 text-center">
                <p className="text-[11px] text-black/30">AgentOS Desktop v0.1.0-alpha</p>
            </div>
        </div>
    </div>
  );
}
