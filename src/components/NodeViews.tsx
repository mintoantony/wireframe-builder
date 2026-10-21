import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import { CATALOG } from '../model/catalog';
import type { WComment, WNode } from '../model/types';
import { useProject } from '../store/useProject';
import { ControlView } from './controls';

/** Set while rendering a page for export; pins then follow the export option instead of the toolbar toggle. */
export const ExportModeContext = createContext<{ includeComments: boolean } | null>(null);

/** The visual frame of a layout node; `children` go where its contents belong. */
export function LayoutFrame({ node, children }: { node: WNode; children: ReactNode }) {
  switch (node.type) {
    case 'container':
      return (
        <div className={`wf-container${node.props.border ? '' : ' no-border'}`}>
          {node.props.title ? <div className="wf-container-title">{node.props.title}</div> : null}
          <div className="wf-stack">{children}</div>
        </div>
      );
    case 'row':
      return <div className="wf-row">{children}</div>;
    case 'column':
      return <div className="wf-column wf-stack">{children}</div>;
    default:
      return <div className="wf-stack">{children}</div>;
  }
}

export function nodeStyle(node: WNode): CSSProperties | undefined {
  if (node.type === 'column') return { flex: `${Number(node.props.span) || 6} 1 0`, minWidth: 0 };
  return undefined;
}

export function commentNumber(comments: WComment[], c: WComment): number {
  return comments.filter((x) => x.pageId === c.pageId).indexOf(c) + 1;
}

/** Numbered markers for the comments anchored to one node. */
export function Pins({ anchorId }: { anchorId: string }) {
  const exportMode = useContext(ExportModeContext);
  const comments = useProject((s) => s.project.comments);
  const show = useProject((s) => s.showComments);
  const openId = useProject((s) => s.openCommentId);
  const openComment = useProject((s) => s.openComment);
  if (!(exportMode ? exportMode.includeComments : show)) return null;
  return (
    <>
      {comments
        .filter((c) => c.anchorId === anchorId)
        .map((c) => {
          const n = commentNumber(comments, c);
          const style = { left: `${c.x * 100}%`, top: `${c.y * 100}%` };
          const cls = `comment-pin${c.resolved ? ' resolved' : ''}${openId === c.id && !exportMode ? ' open' : ''}`;
          if (exportMode) return <span key={c.id} className={cls} style={style}>{n}</span>;
          return (
            <button
              key={c.id}
              type="button"
              className={cls}
              style={style}
              data-comment-id={c.id}
              title={c.text || 'Empty comment'}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                openComment(c.id);
              }}
            >
              {n}
            </button>
          );
        })}
    </>
  );
}

/** Read-only rendering used for exports. */
export function StaticNode({ node }: { node: WNode }) {
  const def = CATALOG[node.type];
  return (
    <div className={`wf-node wf-node-${node.type}`} style={nodeStyle(node)}>
      {def.container ? (
        <LayoutFrame node={node}>
          {node.children?.map((c) => <StaticNode key={c.id} node={c} />)}
        </LayoutFrame>
      ) : (
        <ControlView node={node} />
      )}
      <Pins anchorId={node.id} />
    </div>
  );
}
