import React from 'react';
import { Button } from '../ui/button';
import { PPTKernel } from '@agentos/office/src/ppt';

type PPTToolbarProps = {
  kernel: PPTKernel;
  onUpdate: () => void;
}

export const PPTToolbar: React.FC<PPTToolbarProps> = ({ kernel, onUpdate }) => {
  const handleAddSlide = () => {
    kernel.agent.addSlideWithLayout('New Slide Concept');
    onUpdate();
  };

  const handleExport = async () => {
    const buffer = await kernel.export();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presentation.pptx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAIModify = () => {
    const slides = kernel.getState().slides;
    if (slides.length > 0) {
       // Demo: Replace placeholder in first slide
       kernel.agent.updateTextByPlaceholder(slides[0].id, 'New Slide Concept', 'AI Generated Title');
       onUpdate();
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border-b bg-gray-50">
      <Button variant="outline" size="sm" onClick={handleAddSlide}>
        Add Slide
      </Button>
      <Button variant="outline" size="sm" onClick={handleAIModify}>
        AI Modify (Demo)
      </Button>
      <div className="flex-1" />
      <Button variant="default" size="sm" onClick={handleExport}>
        Export PPTX
      </Button>
    </div>
  );
};
