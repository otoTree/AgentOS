import React, { useState, useEffect, useMemo } from 'react';
import { PPTKernel } from '@agentos/office/src/ppt';
import { PPTViewer } from './ppt-viewer';
import { PPTToolbar } from './toolbar';

interface PPTEditorProps {
  file?: Blob | ArrayBuffer;
  className?: string;
}

export const PPTEditor: React.FC<PPTEditorProps> = ({ file, className }) => {
  // Initialize kernel once
  const kernel = useMemo(() => new PPTKernel(), []);
  
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [version, setVersion] = useState(0); // Used to force re-render on updates
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (file) {
      setLoading(true);
      const load = async () => {
        try {
          const buffer = file instanceof Blob ? await file.arrayBuffer() : file;
          await kernel.load(buffer);
          setVersion(v => v + 1);
          if (kernel.getState().slides.length > 0) {
            setCurrentSlideIndex(0);
          }
        } catch (e) {
          console.error("Failed to load PPTX", e);
        } finally {
          setLoading(false);
        }
      };
      load();
    }
  }, [file, kernel]);

  const slides = kernel.getState().slides;
  const currentSlide = slides[currentSlideIndex];

  const handleUpdate = () => {
    setVersion(v => v + 1);
    // If new slide added, jump to it? Or keep current.
    // Let's ensure index is valid
    const count = kernel.getState().slides.length;
    if (currentSlideIndex >= count && count > 0) {
      setCurrentSlideIndex(count - 1);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading presentation...</div>;
  }

  return (
    <div className={`flex flex-col h-full border rounded-md overflow-hidden bg-gray-50 ${className || ''}`}>
      <PPTToolbar kernel={kernel} onUpdate={handleUpdate} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnails Sidebar */}
        <div className="w-48 bg-gray-100 border-r p-2 overflow-y-auto">
           {slides.map((s, idx) => (
             <div 
               key={s.id}
               className={`mb-2 p-1 border rounded cursor-pointer ${idx === currentSlideIndex ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}`}
               onClick={() => setCurrentSlideIndex(idx)}
             >
               <div className="text-xs text-gray-500 mb-1">Slide {idx + 1}</div>
               {/* Mini Preview - could be scaled down PPTViewer, but for performance just a box for now */}
               <div className="w-full h-24 bg-white border border-gray-100 flex items-center justify-center text-[10px] text-gray-400">
                 Preview
               </div>
             </div>
           ))}
        </div>

        {/* Main View */}
        <div className="flex-1 overflow-auto p-8 flex justify-center items-start">
           <div className="shadow-lg">
             <PPTViewer slide={currentSlide} />
           </div>
        </div>
      </div>
    </div>
  );
};
