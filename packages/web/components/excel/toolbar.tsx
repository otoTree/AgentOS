import React from 'react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Separator } from '../ui/separator';

export type ToolbarProps = {
    onStyleChange: (style: any) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onStyleChange }) => {
    return (
        <div className="flex items-center gap-1 p-2 border-b bg-background">
            <Select onValueChange={(val) => onStyleChange({ fontFamily: val })}>
                <SelectTrigger className="w-[120px] h-8">
                    <SelectValue placeholder="Font" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    <SelectItem value="Courier New">Courier New</SelectItem>
                </SelectContent>
            </Select>

            <Select onValueChange={(val) => onStyleChange({ fontSize: parseInt(val) })}>
                <SelectTrigger className="w-[70px] h-8">
                    <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="14">14</SelectItem>
                    <SelectItem value="16">16</SelectItem>
                    <SelectItem value="18">18</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onStyleChange({ bold: true })}>
                <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onStyleChange({ italic: true })}>
                <Italic className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onStyleChange({ align: 'left' })}>
                <AlignLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onStyleChange({ align: 'center' })}>
                <AlignCenter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onStyleChange({ align: 'right' })}>
                <AlignRight className="h-4 w-4" />
            </Button>
        </div>
    );
};
