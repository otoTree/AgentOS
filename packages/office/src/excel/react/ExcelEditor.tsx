import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { KonvaRenderer } from '../plugins/renderer/konva-renderer';
import { SheetData } from '../model/schema';
import { ExcelAdapter } from '../io/excel-adapter';

export interface ExcelEditorRef {
    save: () => Promise<Blob>;
    getData: () => SheetData | null;
}

interface ExcelEditorProps {
    initialData?: SheetData;
    file?: File | Blob; // If provided, initialData is ignored/overwritten
    onChange?: (data: SheetData) => void;
    className?: string;
}

export const ExcelEditor = forwardRef<ExcelEditorRef, ExcelEditorProps>(({ initialData, file, onChange, className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<KonvaRenderer | null>(null);
    const [sheetData, setSheetData] = useState<SheetData | null>(initialData || null);
    const [loading, setLoading] = useState(false);

    // Initialize Renderer
    useEffect(() => {
        if (!containerRef.current) return;

        // Cleanup previous renderer
        if (rendererRef.current) {
            rendererRef.current.destroy();
        }

        const renderer = new KonvaRenderer();
        renderer.mount(containerRef.current);
        renderer.onCellEdit = (row, col, value) => {
            // This callback is triggered by renderer when cell is edited
            // We need to update our local state or let renderer handle it internally
            // The renderer implementation currently updates internal sheet data directly
            // We can listen to it if we want to bubble up changes
            
            // Re-sync local state? 
            // Ideally we should have a Controller that manages state
            // For MVP, we trust renderer's internal state updates
        };

        rendererRef.current = renderer;

        // Resize observer
        const resizeObserver = new ResizeObserver((entries) => {
            if (!rendererRef.current) return;
            const { width, height } = entries[0].contentRect;
            rendererRef.current.resize(width, height);
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            if (rendererRef.current) {
                rendererRef.current.destroy();
            }
            resizeObserver.disconnect();
        };
    }, []);

    // Load Data
    useEffect(() => {
        const load = async () => {
            if (file) {
                setLoading(true);
                try {
                    const data = await ExcelAdapter.fileToSheetData(file);
                    setSheetData(data);
                } catch (e) {
                    console.error('Failed to parse Excel file', e);
                } finally {
                    setLoading(false);
                }
            } else if (initialData) {
                setSheetData(initialData);
            }
        };
        load();
    }, [file, initialData]);

    // Render Data
    useEffect(() => {
        if (rendererRef.current && sheetData) {
            // Render visible viewport initially, then let scroll manager handle it
            // Renderer.render handles initialization of scroll manager
            rendererRef.current.render(sheetData, {
                startRow: 0,
                startCol: 0,
                endRow: 50, // Initial viewport estimate
                endCol: 20
            });
        }
    }, [sheetData]);

    useImperativeHandle(ref, () => ({
        save: async () => {
            const currentSheet = rendererRef.current?.getCurrentSheet();
            if (!currentSheet) throw new Error('No data to save');
            return await ExcelAdapter.sheetDataToBlob(currentSheet);
        },
        getData: () => rendererRef.current?.getCurrentSheet() || null
    }));

    return (
        <div className={`relative w-full h-full flex flex-col ${className || ''}`}>
            {loading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80">
                    <div>Loading Spreadsheet...</div>
                </div>
            )}
            <div ref={containerRef} className="flex-1 overflow-hidden relative bg-white" />
        </div>
    );
});

ExcelEditor.displayName = 'ExcelEditor';
