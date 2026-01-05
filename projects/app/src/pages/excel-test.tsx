import React from 'react';
import dynamic from 'next/dynamic';
import { SheetData } from '@agentos/office/src/excel/model/schema';
import { AdminLayout } from '@/components/layout/AdminLayout';

const ExcelEditor = dynamic(
  () => import('@agentos/web/components/excel').then((mod) => mod.ExcelEditor),
  { ssr: false }
);

export default function ExcelTestPage() {
    const initialData: SheetData = {
        id: 'sheet1',
        name: 'Test Sheet',
        rowCount: 50,
        colCount: 20,
        cells: new Map([
            ['0,0', { v: 'Hello' }],
            ['0,1', { v: 'World' }],
            ['1,0', { v: 123 }],
            ['1,1', { v: 456 }],
        ]),
        mergedCells: [],
        styles: {}
    };

    return (
        <AdminLayout>
            <div className="flex flex-col h-full gap-4">
                <h1 className="text-2xl font-bold">Excel Component Test</h1>
                <div className="flex-1 border rounded-lg overflow-hidden shadow-sm bg-white">
                    <ExcelEditor initialData={initialData} />
                </div>
            </div>
        </AdminLayout>
    );
}
