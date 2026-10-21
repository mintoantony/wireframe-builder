import type { CSSProperties, ReactNode } from 'react';
import { parseOptions } from '../model/catalog';
import type { Props, WNode } from '../model/types';

const Icon = ({ d }: { d: string }) => (
  <svg className="wf-icon" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
    <path d={d} />
  </svg>
);
const CALENDAR = 'M2.5 3.5h11v10h-11zM2.5 6.5h11M5 2v3M11 2v3';
const CLOCK = 'M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zM8 4.5V8l2.5 1.5';
const CHEVRON = 'M4 6l4 4 4-4';

function Field({ p, children }: { p: Props; children: ReactNode }) {
  return (
    <div className={`wf-field${p.disabled ? ' disabled' : ''}`}>
      {p.label ? (
        <div className="wf-label">
          {p.label}
          {p.required ? <span className="wf-req">*</span> : null}
        </div>
      ) : null}
      {children}
      {p.help ? <div className="wf-help">{p.help}</div> : null}
    </div>
  );
}

const Input = ({ p, icon, style }: { p: Props; icon?: string; style?: CSSProperties }) => (
  <div className="wf-input" style={style}>
    <span className="wf-placeholder">{p.placeholder}</span>
    {icon ? <Icon d={icon} /> : null}
  </div>
);

const alignClass = (p: Props) => `wf-align-${String(p.align ?? 'Left').toLowerCase()}`;

/** Static, non-interactive picture of one control. */
export function ControlView({ node }: { node: WNode }) {
  const p = node.props;
  switch (node.type) {
    case 'textbox':
    case 'number':
      return <Field p={p}><Input p={p} /></Field>;
    case 'multiline':
      return <Field p={p}><Input p={p} style={{ height: (Number(p.rows) || 3) * 22 + 10, alignItems: 'flex-start' }} /></Field>;
    case 'date':
      return <Field p={p}><Input p={p} icon={CALENDAR} /></Field>;
    case 'time':
      return <Field p={p}><Input p={p} icon={CLOCK} /></Field>;
    case 'dropdown':
      return <Field p={p}><Input p={p} icon={CHEVRON} /></Field>;
    case 'checkbox':
      return (
        <span className="wf-check">
          <span className={`wf-box${p.checked ? ' on' : ''}`} />
          {p.text}
        </span>
      );
    case 'checklist':
    case 'radio':
      return (
        <Field p={p}>
          <div className={`wf-options${p.inline ? ' inline' : ''}`}>
            {parseOptions(p.options).map((o, i) => (
              <span className="wf-check" key={i}>
                <span className={`${node.type === 'radio' ? 'wf-circle' : 'wf-box'}${o.on ? ' on' : ''}`} />
                {o.label}
              </span>
            ))}
          </div>
        </Field>
      );
    case 'toggle':
      return (
        <span className="wf-check">
          <span className={`wf-toggle${p.on ? ' on' : ''}`} />
          {p.text}
        </span>
      );
    case 'button':
      return (
        <div className={alignClass(p)}>
          <span className={`wf-button ${String(p.variant).toLowerCase()}${p.fullWidth ? ' full' : ''}`}>{p.text}</span>
        </div>
      );
    case 'link':
      return (
        <div className={alignClass(p)}>
          <span className="wf-link">{p.text}</span>
        </div>
      );
    case 'heading': {
      const Tag = (String(p.level).toLowerCase() as 'h1' | 'h2' | 'h3') || 'h2';
      return <Tag className="wf-heading">{p.text}</Tag>;
    }
    case 'text':
      return <p className="wf-text">{p.text}</p>;
    case 'divider':
      return <hr className="wf-divider" />;
    case 'spacer':
      return <div className="wf-spacer" style={{ height: Number(p.height) || 24 }} />;
    case 'image':
      return (
        <div className="wf-image" style={{ height: Number(p.height) || 160 }}>
          <svg className="wf-image-x" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
            <line x1="0" y1="0" x2="100" y2="100" vectorEffect="non-scaling-stroke" />
            <line x1="100" y1="0" x2="0" y2="100" vectorEffect="non-scaling-stroke" />
          </svg>
          {p.label ? <span className="wf-image-label">{p.label}</span> : null}
        </div>
      );
    case 'table': {
      const cols = String(p.columns ?? '').split(',').map((c) => c.trim()).filter(Boolean);
      const rows = Math.max(1, Number(p.rows) || 3);
      return (
        <table className="wf-table">
          <thead>
            <tr>{cols.map((c, i) => <th key={i}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                {cols.map((_, i) => (
                  <td key={i}><span className="wf-bar" style={{ width: `${45 + ((r * 7 + i * 13) % 40)}%` }} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case 'tabs': {
      const tabs = String(p.tabs ?? '').split('\n').map((t) => t.trim()).filter(Boolean);
      const active = Number(p.active) || 1;
      return (
        <div className="wf-tabs">
          {tabs.map((t, i) => (
            <span key={i} className={`wf-tab${i + 1 === active ? ' active' : ''}`}>{t}</span>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}
