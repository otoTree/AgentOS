import React from 'react';

export interface Command {
  id: string;
  label: string;
  description: string;
  value: string;
}

export const COMMANDS: Command[] = [
  { id: 'files', label: '/open files', description: 'Open File Browser', value: '/open files' },
  { id: 'workbench', label: '/open workbench', description: 'Open Workbench', value: '/open workbench' },
  { id: 'editor', label: '/open editor', description: 'Open Code Editor', value: '/open editor' },
  { id: 'email', label: '/open email', description: 'Open Email Client', value: '/open email' },
  { id: 'browser', label: '/open browser', description: 'Open Web Browser', value: '/open browser' },
];

interface CommandMenuProps {
  isVisible: boolean;
  filter: string;
  selectedIndex: number;
  onSelect: (command: Command) => void;
}

export function CommandMenu({ isVisible, filter, selectedIndex, onSelect }: CommandMenuProps) {
  const filteredCommands = COMMANDS.filter(cmd => 
    cmd.value.toLowerCase().startsWith(filter.toLowerCase()) || 
    cmd.label.toLowerCase().includes(filter.toLowerCase())
  );

  if (!isVisible || filteredCommands.length === 0) return null;

  return (
    <div className="absolute bottom-full mb-2 left-0 w-full bg-popover text-popover-foreground rounded-md border shadow-md overflow-hidden z-50">
      <div className="p-1">
        {filteredCommands.map((cmd, index) => (
          <button
            key={cmd.id}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-sm text-left ${
              index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
            }`}
            onClick={() => onSelect(cmd)}
          >
            <span className="font-medium">{cmd.label}</span>
            <span className="text-xs text-muted-foreground">{cmd.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function getFilteredCommands(filter: string) {
    return COMMANDS.filter(cmd => 
        cmd.value.toLowerCase().startsWith(filter.toLowerCase()) || 
        cmd.label.toLowerCase().includes(filter.toLowerCase())
    );
}
