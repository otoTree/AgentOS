import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../../mainview/utils/cn';
import { useTaskStore } from '../../mainview/store/useTaskStore';

export default function ActiveTasks() {
  const { tasks } = useTaskStore();

  return (
    <div className="space-y-3">
      {tasks.map(task => (
        <div key={task.id} className="bg-white border border-border rounded-xl p-4 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          {/* Progress Bar Background */}
          <div className="absolute bottom-0 left-0 h-0.5 bg-black/80 transition-all duration-500" style={{ width: `${task.progress}%` }}></div>
          
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-2 h-2 rounded-full",
                task.status === 'running' ? 'bg-emerald-500 animate-pulse' : (task.status === 'done' ? 'bg-black/40' : 'bg-amber-400')
              )}></div>
              <h4 className="font-medium text-[13px] text-black">{task.name}</h4>
            </div>
            <span className="text-[11px] font-mono text-black/50">{task.progress}%</span>
          </div>
          
          <div className="flex items-center justify-between text-[12px] text-black/60">
            <span className="truncate pr-4">{task.detail}</span>
            <div className="flex gap-4 flex-shrink-0">
              <span className="flex items-center gap-1"><Clock size={10} /> <span>{task.time}</span></span>
              {task.status === 'running' && <button className="text-destructive hover:text-red-600 cursor-default font-medium">Stop</button>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
