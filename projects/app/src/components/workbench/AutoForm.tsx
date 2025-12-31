import React, { useEffect, useState } from 'react';
import { Input } from '@agentos/web/components/ui/input';
import { Label } from '@agentos/web/components/ui/label';
import { Switch } from '@agentos/web/components/ui/switch';
import { Textarea } from '@agentos/web/components/ui/textarea';
import { Button } from '@agentos/web/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@agentos/web/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { ParamInfo } from '@/utils/python-parser';

interface AutoFormProps {
  params: ParamInfo[];
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
}

export function AutoForm({ params, value, onChange }: AutoFormProps) {
  const schemaKeys = new Set(params.map(p => p.name));
  const customKeys = Object.keys(value).filter(k => !schemaKeys.has(k));

  const handleChange = (name: string, val: any) => {
    const newValue = { ...value, [name]: val };
    onChange(newValue);
  };

  const handleCustomChange = (oldKey: string, newKey: string, newVal: any) => {
    // If key changed
    if (oldKey !== newKey) {
       const { [oldKey]: _, ...rest } = value;
       // If newKey is empty, we just delete the old one? No, user might be typing.
       // But we can't have empty keys in object really. 
       // Let's assume user is careful or handle key collision.
       if (newKey) {
           onChange({ ...rest, [newKey]: newVal });
       }
    } else {
       onChange({ ...value, [oldKey]: newVal });
    }
  };

  const addCustomParam = () => {
    let base = 'new_param';
    let i = 1;
    while (value[base] !== undefined) {
        base = `new_param_${i++}`;
    }
    onChange({ ...value, [base]: '' });
  };

  const removeParam = (key: string) => {
      const { [key]: _, ...rest } = value;
      onChange(rest);
  };

  if (!params || params.length === 0) {
    // If no params detected, we should still allow adding custom params? 
    // Yes, but the message "No arguments detected" might be confusing if we show the add button below.
    // Let's change the layout.
  }

  return (
    <div className="flex flex-col gap-6 p-1">
      {/* Detected Parameters */}
      {params.length > 0 ? (
        <div className="space-y-3">
             <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detected Parameters</div>
             <div className="grid gap-4">
                {params.map((param) => {
                    const currentVal = value[param.name] !== undefined ? value[param.name] : param.default;
                    return (
                    <div key={param.name} className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                        {param.name}
                        <span className="text-xs text-muted-foreground font-normal px-1.5 py-0.5 bg-muted rounded">
                            {param.type}
                        </span>
                        {param.required && <span className="text-red-500">*</span>}
                        </Label>
                        
                        <ParamInput 
                            param={param} 
                            value={currentVal} 
                            onChange={(v) => handleChange(param.name, v)} 
                        />
                    </div>
                    );
                })}
            </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground p-4 text-center border rounded-md border-dashed">
            No arguments detected in main() function.
        </div>
      )}

      {/* Custom Parameters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom Parameters</div>
            <Button size="sm" variant="ghost" onClick={addCustomParam} className="h-6 px-2 text-xs">
                <Plus className="w-3 h-3 mr-1"/> Add Parameter
            </Button>
        </div>
        
        {customKeys.length > 0 ? (
            <div className="grid gap-3">
                {customKeys.map(key => (
                    <CustomParamRow 
                        key={key} 
                        name={key} 
                        value={value[key]} 
                        onChange={(k, v) => handleCustomChange(key, k, v)}
                        onDelete={() => removeParam(key)}
                    />
                ))}
            </div>
        ) : (
            <div className="text-xs text-muted-foreground italic px-2">No custom parameters added.</div>
        )}
      </div>
    </div>
  );
}

function CustomParamRow({ name, value, onChange, onDelete }: { 
    name: string, 
    value: any, 
    onChange: (key: string, val: any) => void, 
    onDelete: () => void 
}) {
    const [keyName, setKeyName] = useState(name);
    // Infer type from value or default to string
    const inferType = (val: any) => {
        if (typeof val === 'boolean') return 'bool';
        if (typeof val === 'number') return Number.isInteger(val) ? 'int' : 'float';
        if (typeof val === 'object') return 'json';
        return 'str';
    };
    const [type, setType] = useState(inferType(value));

    // Handle key blur to update parent
    const handleKeyBlur = () => {
        if (keyName !== name && keyName.trim()) {
            onChange(keyName, value);
        } else if (!keyName.trim()) {
            setKeyName(name); // Revert if empty
        }
    };

    // Handle type change
    const handleTypeChange = (newType: string) => {
        setType(newType);
        // Reset value if type changes drastically? 
        // Or try to convert.
        if (newType === 'bool') onChange(name, false);
        else if (newType === 'int') onChange(name, 0);
        else if (newType === 'float') onChange(name, 0.0);
        else if (newType === 'json') onChange(name, {});
        else onChange(name, String(value || ''));
    };

    return (
        <div className="flex items-start gap-2 p-2 border rounded-md bg-muted/20">
            <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                    <Input 
                        value={keyName} 
                        onChange={e => setKeyName(e.target.value)} 
                        onBlur={handleKeyBlur}
                        className="h-8 text-xs font-mono"
                        placeholder="Parameter Name"
                    />
                    <Select value={type} onValueChange={handleTypeChange}>
                        <SelectTrigger className="w-[80px] h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="str">String</SelectItem>
                            <SelectItem value="int">Int</SelectItem>
                            <SelectItem value="float">Float</SelectItem>
                            <SelectItem value="bool">Bool</SelectItem>
                            <SelectItem value="json">JSON</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                     <ParamInput 
                        param={{ name: 'value', type: type, required: false }} 
                        value={value} 
                        onChange={(v) => onChange(name, v)} 
                    />
                </div>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete}>
                <Trash2 className="w-4 h-4" />
            </Button>
        </div>
    );
}

function ParamInput({ param, value, onChange }: { param: ParamInfo, value: any, onChange: (val: any) => void }) {
  const type = param.type.toLowerCase();
  // Local state for text inputs to avoid cursor jumping or parsing issues while typing
  const [textVal, setTextVal] = useState<string>('');

  useEffect(() => {
    if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
            setTextVal(JSON.stringify(value, null, 2));
        } else {
            setTextVal(String(value));
        }
    } else {
        setTextVal('');
    }
  }, [value]); // Only update when external value changes significantly? 
  // Actually, syncing local state with props is tricky if we want to parse on change.
  // Better approach: Controlled components for simple types. 
  // Uncontrolled or debounced for complex JSON types.

  if (type === 'bool' || type === 'boolean') {
    return (
      <div className="flex items-center space-x-2 h-10">
        <Switch 
          checked={!!value} 
          onCheckedChange={onChange} 
        />
        <span className="text-sm text-muted-foreground">{value ? 'True' : 'False'}</span>
      </div>
    );
  }

  if (type === 'int' || type === 'integer') {
    return (
      <Input 
        type="number" 
        value={value ?? ''} 
        onChange={(e) => {
            const val = e.target.value;
            if (val === '') onChange(undefined);
            else onChange(parseInt(val));
        }}
        placeholder={String(param.default ?? '')}
      />
    );
  }

  if (type === 'float' || type === 'number') {
    return (
        <Input 
          type="number" 
          step="any"
          value={value ?? ''} 
          onChange={(e) => {
            const val = e.target.value;
            if (val === '') onChange(undefined);
            else onChange(parseFloat(val));
          }}
          placeholder={String(param.default ?? '')}
        />
      );
  }

  // List or Dict -> Textarea
  if (type.startsWith('list') || type.startsWith('dict') || type === 'json' || type.includes('[')) {
     return (
        <div className="space-y-1">
            <Textarea 
                defaultValue={typeof value === 'object' ? JSON.stringify(value, null, 2) : value ?? ''}
                onChange={(e) => {
                    try {
                        const val = e.target.value;
                        if (!val.trim()) {
                            onChange(undefined);
                            return;
                        }
                        const parsed = JSON.parse(val);
                        onChange(parsed);
                    } catch {
                        // If invalid JSON, we don't call onChange (keep last valid?) 
                        // Or we pass raw string? 
                        // If we pass raw string, it might break backend if it expects list.
                        // Let's just not update the parent value if invalid, but that prevents typing.
                        // So we need local state.
                    }
                }}
                onBlur={(e) => {
                     // Try parse on blur
                     try {
                        const val = e.target.value;
                        if (val.trim()) {
                            onChange(JSON.parse(val));
                        }
                     } catch {}
                }}
                placeholder={type.includes('dict') ? '{}' : '[]'}
                className="font-mono text-xs min-h-[80px]"
            />
            <p className="text-[10px] text-muted-foreground">Enter valid JSON</p>
        </div>
     );
  }

  // Default: String
  return (
    <Input 
      value={value ?? ''} 
      onChange={(e) => onChange(e.target.value)}
      placeholder={String(param.default ?? '')}
    />
  );
}
