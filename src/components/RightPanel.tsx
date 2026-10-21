import { CATALOG, ROW_PRESETS, type PropField } from '../model/catalog';
import { findNode, findParent } from '../model/tree';
import type { WNode } from '../model/types';
import { useActivePage, useProject } from '../store/useProject';
import { commentNumber } from './NodeViews';

function FieldInput({ node, field }: { node: WNode; field: PropField }) {
  const updateProps = useProject((s) => s.updateProps);
  const value = node.props[field.key];
  const set = (v: string | number | boolean) => updateProps(node.id, { [field.key]: v });
  const id = `f-${node.id}-${field.key}`;

  if (field.kind === 'bool') {
    return (
      <label className="prop-check">
        <input type="checkbox" checked={!!value} onChange={(e) => set(e.target.checked)} />
        {field.label}
      </label>
    );
  }
  let input;
  switch (field.kind) {
    case 'textarea':
    case 'options':
      input = <textarea id={id} rows={field.kind === 'options' ? 5 : 3} value={String(value ?? '')} onChange={(e) => set(e.target.value)} />;
      break;
    case 'select':
      input = (
        <select id={id} value={String(value)} onChange={(e) => set(e.target.value)}>
          {field.choices!.map((c) => <option key={c}>{c}</option>)}
        </select>
      );
      break;
    case 'number':
      input = (
        <input
          id={id}
          type="number"
          min={field.min}
          max={field.max}
          value={Number(value)}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (e.target.value !== '' && !Number.isNaN(n)) set(Math.min(field.max ?? n, Math.max(field.min ?? n, n)));
          }}
        />
      );
      break;
    default:
      input = <input id={id} type="text" value={String(value ?? '')} onChange={(e) => set(e.target.value)} />;
  }
  return (
    <div className="prop">
      <label htmlFor={id}>{field.label}</label>
      {input}
      {field.kind === 'options' ? <div className="prop-hint">One per line. Start a line with * to show it selected.</div> : null}
    </div>
  );
}

function Properties() {
  const page = useActivePage();
  const selectedId = useProject((s) => s.selectedId);
  const { select, removeNode, duplicateNode, setRowLayout, renamePage } = useProject.getState();
  const node = selectedId ? findNode(page.root, selectedId) : null;

  if (!node) {
    return (
      <div className="panel-body">
        <div className="prop">
          <label htmlFor="page-name">Page name</label>
          <input id="page-name" value={page.name} onChange={(e) => renamePage(page.id, e.target.value)} />
        </div>
        <div className="panel-empty">
          <p>Select something on the page to edit it.</p>
          <ul>
            <li><b>Drag</b> items from the left; drag placed items to move them.</li>
            <li><b>Rows</b> hold columns; put controls inside the columns.</li>
            <li><kbd>Del</kbd> delete, <kbd>Ctrl</kbd>+<kbd>D</kbd> duplicate, <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo.</li>
            <li><kbd>C</kbd> comment mode: click anywhere to add a note.</li>
          </ul>
        </div>
      </div>
    );
  }

  const def = CATALOG[node.type];
  const parent = findParent(page.root, node.id)?.parent;
  return (
    <div className="panel-body">
      <div className="prop-title">
        <span className="palette-icon">{def.icon}</span>
        {def.label}
      </div>
      {node.type === 'row' ? (
        <div className="prop">
          <label>Columns</label>
          <div className="preset-grid">
            {ROW_PRESETS.map((p) => (
              <button key={p.label} type="button" className="btn small" onClick={() => setRowLayout(node.id, p.spans)}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="prop-hint">Fewer columns move their contents into the last column. Select a column to change its width.</div>
        </div>
      ) : null}
      {def.fields.map((f) => (
        <FieldInput key={f.key} node={node} field={f} />
      ))}
      <div className="prop-actions">
        {parent && parent.type !== 'page' ? (
          <button type="button" className="btn small" onClick={() => select(parent.id)}>
            Select parent
          </button>
        ) : null}
        <button type="button" className="btn small" onClick={() => duplicateNode(node.id)}>
          Duplicate
        </button>
        <button type="button" className="btn small danger" onClick={() => removeNode(node.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}

function CommentList() {
  const project = useProject((s) => s.project);
  const openId = useProject((s) => s.openCommentId);
  const { setActivePage, openComment, setShowComments, updateComment } = useProject.getState();
  if (project.comments.length === 0) {
    return (
      <div className="panel-body panel-empty">
        <p>No comments yet.</p>
        <p>Turn on <b>Comment</b> mode (or press <kbd>C</kbd>) and click anywhere on the page.</p>
      </div>
    );
  }
  return (
    <div className="panel-body">
      {project.pages.map((page) => {
        const list = project.comments.filter((c) => c.pageId === page.id);
        if (list.length === 0) return null;
        return (
          <section key={page.id}>
            <h3 className="panel-heading">{page.name}</h3>
            {list.map((c) => (
              <div key={c.id} className={`comment-item${c.resolved ? ' resolved' : ''}${openId === c.id ? ' open' : ''}`}>
                <button
                  type="button"
                  className="comment-item-main"
                  onClick={() => {
                    setActivePage(page.id);
                    setShowComments(true);
                    // Wait a frame so the pin exists before the popover looks for it.
                    requestAnimationFrame(() => openComment(c.id));
                  }}
                >
                  <span className="comment-num">{commentNumber(project.comments, c)}</span>
                  <span className="comment-text">{c.text || <i>Empty comment</i>}</span>
                </button>
                <label className="comment-resolve" title="Resolved">
                  <input type="checkbox" checked={c.resolved} onChange={(e) => updateComment(c.id, { resolved: e.target.checked })} />
                </label>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

export function RightPanel() {
  const tab = useProject((s) => s.rightTab);
  const count = useProject((s) => s.project.comments.filter((c) => !c.resolved).length);
  const setRightTab = useProject((s) => s.setRightTab);
  return (
    <aside className="right-panel">
      <div className="tabs-bar">
        <button type="button" className={tab === 'properties' ? 'active' : ''} onClick={() => setRightTab('properties')}>
          Properties
        </button>
        <button type="button" className={tab === 'comments' ? 'active' : ''} onClick={() => setRightTab('comments')}>
          Comments{count ? <span className="badge">{count}</span> : null}
        </button>
      </div>
      {tab === 'properties' ? <Properties /> : <CommentList />}
    </aside>
  );
}
