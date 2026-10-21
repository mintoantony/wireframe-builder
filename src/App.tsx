import { useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { CommentPopover } from './components/CommentPopover';
import { DragLayer } from './components/DragLayer';
import { Palette } from './components/Palette';
import { RightPanel } from './components/RightPanel';
import { PagesBar, Toolbar } from './components/Toolbar';
import { ExportHost } from './export/ExportHost';
import { useProject } from './store/useProject';

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable="true"]');
      if (typing) return;
      const s = useProject.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z') {
        e.preventDefault();
        return e.shiftKey ? s.redo() : s.undo();
      }
      if (mod && key === 'y') {
        e.preventDefault();
        return s.redo();
      }
      if (mod && key === 'd' && s.selectedId) {
        e.preventDefault();
        return s.duplicateNode(s.selectedId);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && s.selectedId) {
        e.preventDefault();
        return s.removeNode(s.selectedId);
      }
      if (!mod && !e.altKey && key === 'c') return s.setCommentMode(!s.commentMode);
      if (e.key === 'Escape') {
        if (s.commentMode) s.setCommentMode(false);
        else s.select(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function App() {
  useShortcuts();
  return (
    <>
      <DragLayer>
        <div className="app">
          <Toolbar />
          <PagesBar />
          <div className="workspace">
            <Palette />
            <Canvas />
            <RightPanel />
          </div>
        </div>
      </DragLayer>
      <CommentPopover />
      <ExportHost />
    </>
  );
}
