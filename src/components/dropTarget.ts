import { canAccept, CATALOG } from '../model/catalog';
import { findNode, findParent } from '../model/tree';
import type { NodeType, WNode } from '../model/types';

export type DragData = { kind: 'palette'; type: NodeType } | { kind: 'node'; id: string; type: NodeType };

export interface DropTarget {
  parentId: string;
  index: number;
}

interface Point {
  x: number;
  y: number;
}

/** Pointer this close to a layout node's edge drops beside it rather than inside it. */
const EDGE = 10;

const nodeEl = (id: string) => document.querySelector<HTMLElement>(`.canvas-page [data-node-id="${id}"]`);

/** Works out where a drag would land from the element under the pointer. */
export function computeDropTarget(p: Point, drag: DragData, root: WNode): DropTarget | null {
  const hit = document
    .elementsFromPoint(p.x, p.y)
    .find((el) => el.closest('.canvas-page') && !el.closest('.drag-chip'));
  let el = hit?.closest<HTMLElement>('[data-node-id]') ?? null;
  if (!el) return null;
  if (drag.kind === 'node') {
    // Inside the node being dragged: treat as hovering the node itself.
    const self = el.closest<HTMLElement>(`[data-node-id="${drag.id}"]`);
    if (self) el = self;
  }
  return resolveAt(el, p, drag, root);
}

function resolveAt(el: HTMLElement, p: Point, drag: DragData, root: WNode): DropTarget | null {
  const id = el.dataset.nodeId!;
  const node = findNode(root, id);
  if (!node) return null;
  const isDragged = drag.kind === 'node' && drag.id === id;
  const loc = findParent(root, id);
  const parentAccepts = !!loc && canAccept(loc.parent.type, drag.type);
  const horizontal = loc?.parent.type === 'row';
  const rect = el.getBoundingClientRect();

  if (!isDragged && CATALOG[node.type].container && canAccept(node.type, drag.type)) {
    if (loc && parentAccepts) {
      if (horizontal ? p.x - rect.left < EDGE : p.y - rect.top < EDGE) return { parentId: loc.parent.id, index: loc.index };
      if (horizontal ? rect.right - p.x < EDGE : rect.bottom - p.y < EDGE) return { parentId: loc.parent.id, index: loc.index + 1 };
    }
    return { parentId: node.id, index: indexByPointer(node, p) };
  }
  if (loc && parentAccepts) {
    const before = horizontal ? p.x < rect.left + rect.width / 2 : p.y < rect.top + rect.height / 2;
    return { parentId: loc.parent.id, index: loc.index + (before ? 0 : 1) };
  }
  const up = el.parentElement?.closest<HTMLElement>('[data-node-id]');
  return up ? resolveAt(up, p, drag, root) : null;
}

function indexByPointer(node: WNode, p: Point): number {
  const horizontal = node.type === 'row';
  const kids = node.children ?? [];
  for (let i = 0; i < kids.length; i++) {
    const r = nodeEl(kids[i].id)?.getBoundingClientRect();
    if (!r) continue;
    if (horizontal ? p.x < r.left + r.width / 2 : p.y < r.top + r.height / 2) return i;
  }
  return kids.length;
}
