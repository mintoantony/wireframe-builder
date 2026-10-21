import { useDraggable } from '@dnd-kit/core';
import type { MouseEvent, ReactNode } from 'react';
import { CATALOG } from '../model/catalog';
import type { WNode } from '../model/types';
import { useActivePage, useProject } from '../store/useProject';
import { ControlView } from './controls';
import { useDropTarget } from './DragLayer';
import { LayoutFrame, nodeStyle, Pins } from './NodeViews';

function DropMarker({ horizontal }: { horizontal: boolean }) {
  return <div className={`drop-marker${horizontal ? ' h' : ''}`} />;
}

function EditableChildren({ parent }: { parent: WNode }) {
  const target = useDropTarget();
  const kids = parent.children ?? [];
  const horizontal = parent.type === 'row';
  const marker = target?.parentId === parent.id ? target.index : -1;
  const items: ReactNode[] = [];
  kids.forEach((child, i) => {
    if (marker === i) items.push(<DropMarker key="marker" horizontal={horizontal} />);
    items.push(<EditableNode key={child.id} node={child} />);
  });
  if (marker === kids.length) items.push(<DropMarker key="marker" horizontal={horizontal} />);
  if (kids.length === 0 && parent.type !== 'page') {
    items.push(
      <div key="empty" className="wf-empty">
        {parent.type === 'row' ? 'Drop columns here' : 'Drop controls here'}
      </div>,
    );
  }
  return <>{items}</>;
}

function EditableNode({ node }: { node: WNode }) {
  const def = CATALOG[node.type];
  const selected = useProject((s) => s.selectedId === node.id);
  const commentMode = useProject((s) => s.commentMode);
  const select = useProject((s) => s.select);
  const target = useDropTarget();
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `node:${node.id}`,
    data: { kind: 'node', id: node.id, type: node.type },
  });
  const cls = [
    'wf-node',
    `wf-node-${node.type}`,
    selected && 'selected',
    isDragging && 'dragging',
    target?.parentId === node.id && 'drop-into',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={setNodeRef}
      {...(commentMode ? {} : listeners)}
      {...attributes}
      aria-label={def.label}
      data-node-id={node.id}
      className={cls}
      style={nodeStyle(node)}
      onClick={(e) => {
        e.stopPropagation();
        select(node.id);
      }}
    >
      <span className="wf-tag">{def.label}</span>
      {def.container ? (
        <LayoutFrame node={node}>
          <EditableChildren parent={node} />
        </LayoutFrame>
      ) : (
        <ControlView node={node} />
      )}
      <Pins anchorId={node.id} />
    </div>
  );
}

export function Canvas() {
  const page = useActivePage();
  const device = useProject((s) => s.device);
  const commentMode = useProject((s) => s.commentMode);
  const select = useProject((s) => s.select);
  const addComment = useProject((s) => s.addComment);
  const target = useDropTarget();

  // In comment mode a click anywhere on the page drops a pin on the element under it.
  const placeComment = (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('.comment-pin')) return;
    e.preventDefault();
    e.stopPropagation();
    const anchor = t.closest<HTMLElement>('[data-node-id]');
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    addComment({
      pageId: page.id,
      anchorId: anchor.dataset.nodeId!,
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    });
  };

  const empty = (page.root.children ?? []).length === 0;
  return (
    <main className="canvas-scroll" onClick={() => select(null)}>
      <div
        className={`canvas-page page-frame device-${device}${commentMode ? ' comment-mode' : ''}${target?.parentId === page.root.id ? ' drop-into' : ''}`}
        data-node-id={page.root.id}
        onClickCapture={commentMode ? placeComment : undefined}
      >
        <EditableChildren parent={page.root} />
        {empty ? (
          <div className="empty-hint">
            Drag controls from the left onto this page.
            <br />
            Start with a <b>Container</b> or a <b>Row</b> to build columns.
          </div>
        ) : null}
        <Pins anchorId={page.root.id} />
      </div>
    </main>
  );
}
