import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
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

  const targetAt = (e: DragMoveEvent | DragEndEvent) => {
    const start = e.activatorEvent as PointerEvent;
    const p = { x: start.clientX + e.delta.x, y: start.clientY + e.delta.y };
    const s = useProject.getState();
    const page = s.project.pages.find((pg) => pg.id === s.activePageId)!;
    return computeDropTarget(p, e.active.data.current as DragData, page.root);
  };

  const onDragMove = (e: DragMoveEvent) => {
    const next = targetAt(e);
    setTarget((prev) => (prev?.parentId === next?.parentId && prev?.index === next?.index ? prev : next));
  };

  const finish = () => {
    setActive(null);
    setTarget(null);
  };

  // Recomputed at release so quick drags with few pointer moves still land.
  const onDragEnd = (e: DragEndEvent) => {
    const drag = e.active.data.current as DragData;
    const drop = targetAt(e);
    if (drop) {
      const s = useProject.getState();
      if (drag.kind === 'palette') s.addNode(drop.parentId, drop.index, drag.type);
      else {
        s.moveNode(drag.id, drop.parentId, drop.index);
        s.select(drag.id);
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
