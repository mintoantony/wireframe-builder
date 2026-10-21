import { useRef, useState } from 'react';
import { downloadBlob, slug } from '../export/download';
import type { Device } from '../model/types';
import { parseProject, useProject, type ExportKind } from '../store/useProject';

const DEVICES: { id: Device; label: string }[] = [
  { id: 'desktop', label: 'Desktop' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'mobile', label: 'Mobile' },
];

function ExportMenu() {
  const [includeComments, setIncludeComments] = useState(true);
  const menu = useRef<HTMLDetailsElement>(null);
  const run = (kind: ExportKind | 'json') => {
    menu.current!.open = false;
    const s = useProject.getState();
    if (kind === 'json') {
      const blob = new Blob([JSON.stringify(s.project, null, 2)], { type: 'application/json' });
      return downloadBlob(`${slug(s.project.name)}.wireframe.json`, blob);
    }
    const pageIds = kind === 'png' ? [s.activePageId] : s.project.pages.map((p) => p.id);
    s.setExportJob({ kind, includeComments, pageIds });
  };
  return (
    <details className="menu" ref={menu}>
      <summary className="btn primary">Export ▾</summary>
      <div className="menu-pop">
        <label className="prop-check">
          <input type="checkbox" checked={includeComments} onChange={(e) => setIncludeComments(e.target.checked)} />
          Include comments
        </label>
        <button type="button" onClick={() => run('png')}>PNG image <small>this page</small></button>
        <button type="button" onClick={() => run('pdf')}>PDF / Print <small>all pages</small></button>
        <button type="button" onClick={() => run('html')}>HTML file <small>all pages</small></button>
        <button type="button" onClick={() => run('json')}>Project file (.json) <small>re-open later</small></button>
      </div>
    </details>
  );
}

export function Toolbar() {
  const name = useProject((s) => s.project.name);
  const canUndo = useProject((s) => s.past.length > 0);
  const canRedo = useProject((s) => s.future.length > 0);
  const device = useProject((s) => s.device);
  const commentMode = useProject((s) => s.commentMode);
  const showComments = useProject((s) => s.showComments);
  const { renameProject, undo, redo, setDevice, setCommentMode, setShowComments, newProject, loadProject } = useProject.getState();
  const fileInput = useRef<HTMLInputElement>(null);

  const save = () => {
    const p = useProject.getState().project;
    downloadBlob(`${slug(p.name)}.wireframe.json`, new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' }));
  };
  const open = async (file: File) => {
    try {
      loadProject(parseProject(await file.text()));
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <header className="toolbar">
      <div className="brand">▦ Wireframe Builder</div>
      <input className="project-name" aria-label="Project name" value={name} onChange={(e) => renameProject(e.target.value)} />
      <div className="tool-group">
        <button type="button" className="btn" onClick={() => confirm('Start a new, empty wireframe? Unsaved work will be lost.') && newProject()}>
          New
        </button>
        <button type="button" className="btn" onClick={() => fileInput.current!.click()}>Open</button>
        <button type="button" className="btn" onClick={save}>Save</button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) open(f);
            e.target.value = '';
          }}
        />
      </div>
      <div className="tool-group">
        <button type="button" className="btn" disabled={!canUndo} onClick={undo} title="Undo (Ctrl+Z)">↶ Undo</button>
        <button type="button" className="btn" disabled={!canRedo} onClick={redo} title="Redo (Ctrl+Y)">↷ Redo</button>
      </div>
      <div className="segmented" role="group" aria-label="Page width">
        {DEVICES.map((d) => (
          <button key={d.id} type="button" className={device === d.id ? 'active' : ''} onClick={() => setDevice(d.id)}>
            {d.label}
          </button>
        ))}
      </div>
      <div className="tool-group">
        <button
          type="button"
          className={`btn${commentMode ? ' on' : ''}`}
          aria-pressed={commentMode}
          onClick={() => setCommentMode(!commentMode)}
          title="Comment mode (C): click anywhere on the page to add a note"
        >
          💬 Comment
        </button>
        <label className="prop-check">
          <input type="checkbox" checked={showComments} onChange={(e) => setShowComments(e.target.checked)} />
          Show comments
        </label>
      </div>
      <div className="spacer" />
      <ExportMenu />
    </header>
  );
}

export function PagesBar() {
  const pages = useProject((s) => s.project.pages);
  const activeId = useProject((s) => s.activePageId);
  const { setActivePage, addPage, removePage, renamePage } = useProject.getState();
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <nav className="pages-bar">
      {pages.map((p) => (
        <div key={p.id} className={`page-tab${p.id === activeId ? ' active' : ''}`} onClick={() => setActivePage(p.id)} onDoubleClick={() => setEditing(p.id)}>
          {editing === p.id ? (
            <input
              autoFocus
              value={p.name}
              onChange={(e) => renamePage(p.id, e.target.value)}
              onBlur={() => setEditing(null)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && setEditing(null)}
            />
          ) : (
            <span title="Double-click to rename">{p.name}</span>
          )}
          {pages.length > 1 ? (
            <button
              type="button"
              className="page-close"
              title="Delete page"
              onClick={(e) => {
                e.stopPropagation();
                const hasContent = (p.root.children?.length ?? 0) > 0;
                if (!hasContent || confirm(`Delete "${p.name}"?`)) removePage(p.id);
              }}
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
      <button type="button" className="page-add" onClick={addPage} title="Add page">
        + Page
      </button>
    </nav>
  );
}
