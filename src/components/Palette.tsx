import { useDraggable } from '@dnd-kit/core';
import { CATALOG, PALETTE_GROUPS } from '../model/catalog';
import type { NodeType } from '../model/types';
import { useProject } from '../store/useProject';

function PaletteItem({ type }: { type: NodeType }) {
  const def = CATALOG[type];
  const insertNear = useProject((s) => s.insertNear);
  const { setNodeRef, listeners, attributes } = useDraggable({ id: `palette:${type}`, data: { kind: 'palette', type } });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="palette-item"
      title="Drag onto the page, or double-click to add next to the selection"
      onDoubleClick={() => insertNear(type)}
    >
      <span className="palette-icon">{def.icon}</span>
      {def.label}
    </div>
  );
}

export function Palette() {
  const types = Object.values(CATALOG);
  return (
    <aside className="palette">
      {PALETTE_GROUPS.map((group) => (
        <section key={group}>
          <h3 className="panel-heading">{group}</h3>
          <div className="palette-grid">
            {types
              .filter((d) => d.group === group)
              .map((d) => (
                <PaletteItem key={d.type} type={d.type} />
              ))}
          </div>
        </section>
      ))}
      <p className="palette-tip">Double-click an item to add it next to the selected one.</p>
    </aside>
  );
}
