import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import ChatPage from './pages/Chat';
import WorkspacePage from './pages/Workspace';
import SkillsPage from './pages/Skills';
import TasksPage from './pages/Tasks';
import SettingsPage from './pages/Settings';
import LoginPage from './pages/Auth/Login';
import RegisterPage from './pages/Auth/Register';
import { useUIStore } from './store/useUIStore';
import { useAuthStore } from './store/useAuthStore';
import { apiClient } from '../bun/api';

export default function App() {
  const { activeTab } = useUIStore();
  const { isAuthenticated, token, logout } = useAuthStore();
  const [authPage, setAuthPage] = useState<'login' | 'register'>('login');
  const [isValidating, setIsValidating] = useState(false);

  // Sync token to apiClient whenever it changes
  useEffect(() => {
    if (token) {
      apiClient.setToken(token);
    } else {
      apiClient.setToken('');
    }
  }, [token]);

  // Validate session on mount
  useEffect(() => {
    const validateSession = async () => {
      if (isAuthenticated && token) {
        setIsValidating(true);
        // Ensure token is set before making request
        apiClient.setToken(token);
        try {
          await apiClient.chatSessionsList();
        } catch (error) {
          console.error('Session validation failed:', error);
          logout();
        } finally {
          setIsValidating(false);
        }
      }
    };

    validateSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  if (isValidating) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return authPage === 'login' ? (
      <LoginPage onNavigate={setAuthPage} />
    ) : (
      <RegisterPage onNavigate={setAuthPage} />
    );
  }

  return (
    <>
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0 bg-background relative">
        <Header />
        
        {activeTab === 'chat' && <ChatPage />}
        {activeTab === 'workspace' && <WorkspacePage />}
        {activeTab === 'skills' && <SkillsPage />}
        {activeTab === 'tasks' && <TasksPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
    </>
  );
}
