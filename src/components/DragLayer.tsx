import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { CATALOG } from '../model/catalog';
import { useProject } from '../store/useProject';
import { computeDropTarget, type DragData, type DropTarget } from './dropTarget';

const DropTargetContext = createContext<DropTarget | null>(null);
export const useDropTarget = () => useContext(DropTargetContext);

/**
 * dnd-kit supplies the drag gesture and overlay; where an item lands is computed
 * from the element under the pointer (see dropTarget.ts).
 */
export function DragLayer({ children }: { children: ReactNode }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [active, setActive] = useState<DragData | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);

  const onDragStart = (e: DragStartEvent) => {
    setActive(e.active.data.current as DragData);
    useProject.getState().openComment(null);
  };

  const onDragMove = (e: DragMoveEvent) => {
    const start = e.activatorEvent as PointerEvent;
    const p = { x: start.clientX + e.delta.x, y: start.clientY + e.delta.y };
    const s = useProject.getState();
    const page = s.project.pages.find((pg) => pg.id === s.activePageId)!;
    const next = computeDropTarget(p, e.active.data.current as DragData, page.root);
    setTarget((prev) => (prev?.parentId === next?.parentId && prev?.index === next?.index ? prev : next));
  };

  const finish = () => {
    setActive(null);
    setTarget(null);
  };

  const onDragEnd = () => {
    if (active && target) {
      const s = useProject.getState();
      if (active.kind === 'palette') s.addNode(target.parentId, target.index, active.type);
      else {
        s.moveNode(active.id, target.parentId, target.index);
        s.select(active.id);
      }
    }
    finish();
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragMove={onDragMove} onDragEnd={onDragEnd} onDragCancel={finish} autoScroll={false}>
      <DropTargetContext.Provider value={target}>{children}</DropTargetContext.Provider>
      <DragOverlay dropAnimation={null}>
        {active ? (
          <div className={`drag-chip${target ? '' : ' no-target'}`}>
            <span className="palette-icon">{CATALOG[active.type].icon}</span>
            {CATALOG[active.type].label}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
