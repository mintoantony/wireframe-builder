import { nanoid } from 'nanoid';
import type { NodeType, Props, WNode } from './types';

export type FieldKind = 'text' | 'textarea' | 'options' | 'bool' | 'select' | 'number';

export interface PropField {
  key: string;
  label: string;
  kind: FieldKind;
  choices?: string[];
  min?: number;
  max?: number;
}

export type Group = 'Layout' | 'Inputs' | 'Actions & content';

export interface ControlDef {
  type: NodeType;
  label: string;
  group: Group | null;
  icon: string;
  /** Layout nodes hold children. */
  container?: boolean;
  defaults: Props;
  fields: PropField[];
}

const text = (key: string, label: string): PropField => ({ key, label, kind: 'text' });
const bool = (key: string, label: string): PropField => ({ key, label, kind: 'bool' });
const select = (key: string, label: string, choices: string[]): PropField => ({ key, label, kind: 'select', choices });
const num = (key: string, label: string, min: number, max: number): PropField => ({ key, label, kind: 'number', min, max });

const LABEL = text('label', 'Label');
const PLACEHOLDER = text('placeholder', 'Placeholder');
const HELP = text('help', 'Help text');
const REQUIRED = bool('required', 'Required');
const DISABLED = bool('disabled', 'Disabled');
const OPTIONS: PropField = { key: 'options', label: 'Options', kind: 'options' };
const ALIGN = select('align', 'Align', ['Left', 'Center', 'Right']);
const fieldDefaults = { required: false, disabled: false, help: '' };

export const CATALOG: Record<NodeType, ControlDef> = {
  page: { type: 'page', label: 'Page', group: null, icon: '', container: true, defaults: {}, fields: [] },
  container: {
    type: 'container', label: 'Container', group: 'Layout', icon: '▢', container: true,
    defaults: { title: 'Section', border: true },
    fields: [text('title', 'Title'), bool('border', 'Show border')],
  },
  row: { type: 'row', label: 'Row', group: 'Layout', icon: '▥', container: true, defaults: {}, fields: [] },
  column: {
    type: 'column', label: 'Column', group: 'Layout', icon: '▯', container: true,
    defaults: { span: 6 },
    fields: [num('span', 'Width (relative, 1–12)', 1, 12)],
  },
  divider: { type: 'divider', label: 'Divider', group: 'Layout', icon: '—', defaults: {}, fields: [] },
  spacer: { type: 'spacer', label: 'Spacer', group: 'Layout', icon: '↕', defaults: { height: 24 }, fields: [num('height', 'Height (px)', 4, 400)] },

  textbox: {
    type: 'textbox', label: 'Textbox', group: 'Inputs', icon: '▭',
    defaults: { label: 'Label', placeholder: 'Enter text', ...fieldDefaults },
    fields: [LABEL, PLACEHOLDER, HELP, REQUIRED, DISABLED],
  },
  multiline: {
    type: 'multiline', label: 'Multiline', group: 'Inputs', icon: '☰',
    defaults: { label: 'Description', placeholder: 'Enter details…', rows: 3, ...fieldDefaults },
    fields: [LABEL, PLACEHOLDER, num('rows', 'Rows', 2, 20), HELP, REQUIRED, DISABLED],
  },
  number: {
    type: 'number', label: 'Number', group: 'Inputs', icon: '#',
    defaults: { label: 'Quantity', placeholder: '0', ...fieldDefaults },
    fields: [LABEL, PLACEHOLDER, HELP, REQUIRED, DISABLED],
  },
  date: {
    type: 'date', label: 'Date picker', group: 'Inputs', icon: '▦',
    defaults: { label: 'Date', placeholder: 'dd/mm/yyyy', ...fieldDefaults },
    fields: [LABEL, PLACEHOLDER, HELP, REQUIRED, DISABLED],
  },
  time: {
    type: 'time', label: 'Time picker', group: 'Inputs', icon: '◷',
    defaults: { label: 'Time', placeholder: 'hh:mm', ...fieldDefaults },
    fields: [LABEL, PLACEHOLDER, HELP, REQUIRED, DISABLED],
  },
  dropdown: {
    type: 'dropdown', label: 'Dropdown', group: 'Inputs', icon: '▾',
    defaults: { label: 'Choose one', placeholder: 'Select…', options: 'Option 1\nOption 2\nOption 3', ...fieldDefaults },
    fields: [LABEL, PLACEHOLDER, OPTIONS, HELP, REQUIRED, DISABLED],
  },
  checkbox: {
    type: 'checkbox', label: 'Checkbox', group: 'Inputs', icon: '☑',
    defaults: { text: 'I agree to the terms', checked: false },
    fields: [text('text', 'Text'), bool('checked', 'Checked')],
  },
  checklist: {
    type: 'checklist', label: 'Check list', group: 'Inputs', icon: '☷',
    defaults: { label: 'Pick any', options: '*Option 1\nOption 2\nOption 3', inline: false, ...fieldDefaults },
    fields: [LABEL, OPTIONS, bool('inline', 'Show in one line'), HELP, REQUIRED, DISABLED],
  },
  radio: {
    type: 'radio', label: 'Radio list', group: 'Inputs', icon: '◉',
    defaults: { label: 'Pick one', options: '*Option A\nOption B\nOption C', inline: false, ...fieldDefaults },
    fields: [LABEL, OPTIONS, bool('inline', 'Show in one line'), HELP, REQUIRED, DISABLED],
  },
  toggle: {
    type: 'toggle', label: 'Toggle', group: 'Inputs', icon: '◐',
    defaults: { text: 'Enable notifications', on: true },
    fields: [text('text', 'Text'), bool('on', 'On')],
  },

  button: {
    type: 'button', label: 'Button', group: 'Actions & content', icon: '▬',
    defaults: { text: 'Submit', variant: 'Primary', align: 'Left', fullWidth: false },
    fields: [text('text', 'Text'), select('variant', 'Style', ['Primary', 'Secondary', 'Text']), ALIGN, bool('fullWidth', 'Full width')],
  },
  link: {
    type: 'link', label: 'Link', group: 'Actions & content', icon: '↗',
    defaults: { text: 'Learn more', align: 'Left' },
    fields: [text('text', 'Text'), ALIGN],
  },
  heading: {
    type: 'heading', label: 'Heading', group: 'Actions & content', icon: 'H',
    defaults: { text: 'Heading', level: 'H2' },
    fields: [text('text', 'Text'), select('level', 'Size', ['H1', 'H2', 'H3'])],
  },
  text: {
    type: 'text', label: 'Text / label', group: 'Actions & content', icon: 'T',
    defaults: { text: 'Some descriptive text goes here.' },
    fields: [{ key: 'text', label: 'Text', kind: 'textarea' }],
  },
  image: {
    type: 'image', label: 'Image', group: 'Actions & content', icon: '▨',
    defaults: { label: 'Image', height: 160 },
    fields: [text('label', 'Caption'), num('height', 'Height (px)', 24, 800)],
  },
  table: {
    type: 'table', label: 'Table', group: 'Actions & content', icon: '▤',
    defaults: { columns: 'Name, Status, Date', rows: 3 },
    fields: [text('columns', 'Columns (comma separated)'), num('rows', 'Rows', 1, 30)],
  },
  tabs: {
    type: 'tabs', label: 'Tabs', group: 'Actions & content', icon: '⊓',
    defaults: { tabs: 'Overview\nDetails\nHistory', active: 1 },
    fields: [{ key: 'tabs', label: 'Tabs (one per line)', kind: 'textarea' }, num('active', 'Active tab', 1, 20)],
  },
};

export const PALETTE_GROUPS: Group[] = ['Layout', 'Inputs', 'Actions & content'];

export function canAccept(parent: NodeType, child: NodeType): boolean {
  if (child === 'page') return false;
  if (parent === 'row') return child === 'column';
  if (parent === 'page' || parent === 'container' || parent === 'column') return child !== 'column';
  return false;
}

export const newId = () => nanoid(10);

export function createNode(type: NodeType): WNode {
  const def = CATALOG[type];
  const node: WNode = { id: newId(), type, props: { ...def.defaults } };
  if (type === 'row') node.children = [createNode('column'), createNode('column')];
  else if (def.container) node.children = [];
  return node;
}

export interface OptionItem {
  label: string;
  on: boolean;
}

/** One option per line; a leading `*` marks it as selected/checked. */
export function parseOptions(value: unknown): OptionItem[] {
  return String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.startsWith('*') ? { label: line.slice(1).trim(), on: true } : { label: line, on: false }));
}

/** Column layouts offered for rows, as relative widths. */
export const ROW_PRESETS: { label: string; spans: number[] }[] = [
  { label: '1', spans: [12] },
  { label: '2', spans: [6, 6] },
  { label: '3', spans: [4, 4, 4] },
  { label: '4', spans: [3, 3, 3, 3] },
  { label: '1 : 2', spans: [4, 8] },
  { label: '2 : 1', spans: [8, 4] },
  { label: '1 : 2 : 1', spans: [3, 6, 3] },
];
