import React from 'react';
import { cn } from '../../lib/utils';

// Define a compatible interface for the props used in SkillEditor
export interface CodeEditorProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  language?: string;
  theme?: string;
  options?: any;
  className?: string;
  [key: string]: any; // Allow other props to pass through silently
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ 
  value, 
  onChange, 
  className,
  // Destructure unused props to prevent them from being passed to textarea
  language,
  theme,
  options,
  ...props 
}) => {
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      
      // Insert 4 spaces for tab
      const newValue = val.substring(0, start) + "    " + val.substring(end);
      
      // Call onChange with new value
      onChange?.(newValue);
      
      // Need to defer setting selection range to after render cycle in React
      // But since we are controlling value, we can try to set it immediately 
      // though React render might reset it. 
      // A more robust way in React controlled components requires useEffect, 
      // but for simple cases this often works if state update is fast.
      // Actually, with controlled components, the cursor jumps to end often.
      // Let's keep it simple for now: standard textarea behavior + tab support logic needs care.
      // To properly handle cursor in React controlled textarea:
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      });
    }
  };

  return (
    <div className="h-full w-full overflow-hidden border rounded-md bg-white">
      <textarea
        className={cn(
          "w-full h-full resize-none p-4 font-mono text-[13px] leading-relaxed outline-none border-none text-black bg-white",
          className
        )}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        {...props}
      />
    </div>
  );
};
