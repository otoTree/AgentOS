import React from 'react';
import WorkspaceStats from '../../../components/workspace/WorkspaceStats';
import WorkspaceDropZone from '../../../components/workspace/WorkspaceDropZone';
import WorkspaceFileList from '../../../components/workspace/WorkspaceFileList';

export default function WorkspacePage() {
  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto animate-slide-in">
        <WorkspaceStats />
        <WorkspaceDropZone />
        <WorkspaceFileList />
    </div>
  );
}
