import { newId } from './catalog';
import type { WNode } from './types';

export function findNode(root: WNode, id: string): WNode | null {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const hit = findNode(child, id);
    if (hit) return hit;
  }
  return null;
}

export function findParent(root: WNode, id: string): { parent: WNode; index: number } | null {
  const kids = root.children ?? [];
  for (let i = 0; i < kids.length; i++) {
    if (kids[i].id === id) return { parent: root, index: i };
    const hit = findParent(kids[i], id);
    if (hit) return hit;
  }
  return null;
}

export function collectIds(node: WNode, into = new Set<string>()): Set<string> {
  into.add(node.id);
  for (const child of node.children ?? []) collectIds(child, into);
  return into;
}

export function cloneWithNewIds(node: WNode): WNode {
  return {
    ...node,
    id: newId(),
    props: { ...node.props },
    children: node.children?.map(cloneWithNewIds),
  };
}
