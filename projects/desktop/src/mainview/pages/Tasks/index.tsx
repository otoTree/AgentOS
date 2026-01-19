import React from 'react';
import { Zap } from 'lucide-react';
import ActiveTasks from '../../../components/tasks/ActiveTasks';

export default function TasksPage() {
  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto animate-slide-in">
        <div className="max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-black">Task Manager</h1>
                    <p className="text-black/50 mt-1 text-[13px]">Monitor background agents and batch processes.</p>
                </div>
                <div className="flex gap-2">
                    <button className="bg-white border border-border hover:bg-gray-50 text-black px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-default shadow-sm">
                        History
                    </button>
                    <button className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-black/90 transition-colors flex items-center gap-2 shadow-sm cursor-default">
                        <Zap size={14} /> New Batch Task
                    </button>
                </div>
            </div>

            <ActiveTasks />
        </div>
    </div>
  );
}
