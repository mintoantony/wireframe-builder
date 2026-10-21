export type NodeType =
  | 'page'
  | 'container'
  | 'row'
  | 'column'
  | 'divider'
  | 'spacer'
  | 'textbox'
  | 'multiline'
  | 'number'
  | 'date'
  | 'time'
  | 'dropdown'
  | 'checkbox'
  | 'checklist'
  | 'radio'
  | 'toggle'
  | 'button'
  | 'link'
  | 'heading'
  | 'text'
  | 'image'
  | 'table'
  | 'tabs';

export type PropValue = string | number | boolean;
export type Props = Record<string, PropValue>;

export interface WNode {
  id: string;
  type: NodeType;
  props: Props;
  children?: WNode[];
}

export interface Page {
  id: string;
  name: string;
  root: WNode;
}

/** A note pinned to a node. x/y are fractions (0..1) of the anchor's box, so the pin moves with it. */
export interface WComment {
  id: string;
  pageId: string;
  anchorId: string;
  x: number;
  y: number;
  text: string;
  resolved: boolean;
  createdAt: number;
}

export interface Project {
  version: 1;
  name: string;
  pages: Page[];
  comments: WComment[];
}

export type Device = 'desktop' | 'tablet' | 'mobile';
