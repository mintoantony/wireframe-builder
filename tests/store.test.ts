import { beforeEach, describe, expect, it } from 'vitest';
import { canAccept, parseOptions } from '../src/model/catalog';
import { emptyProject, parseProject, useProject } from '../src/store/useProject';

const s = () => useProject.getState();
const root = () => s().project.pages[0].root;

beforeEach(() => {
  s().loadProject(emptyProject());
});

describe('adding and moving nodes', () => {
  it('adds a control to the page and selects it', () => {
    s().addNode(root().id, 0, 'textbox');
    expect(root().children).toHaveLength(1);
    expect(root().children![0].type).toBe('textbox');
    expect(s().selectedId).toBe(root().children![0].id);
  });

  it('creates rows with two columns', () => {
    s().addNode(root().id, 0, 'row');
    const row = root().children![0];
    expect(row.children!.map((c) => c.type)).toEqual(['column', 'column']);
  });

  it('refuses drops that break the layout rules', () => {
    s().addNode(root().id, 0, 'row');
    const row = root().children![0];
    s().addNode(row.id, 0, 'textbox');
    s().addNode(root().id, 0, 'column');
    expect(row.children).toHaveLength(2);
    expect(root().children).toHaveLength(1);
    expect(canAccept('row', 'column')).toBe(true);
  });

  it('moves a node into a column and reorders within a parent', () => {
    s().addNode(root().id, 0, 'row');
    s().addNode(root().id, 1, 'textbox');
    s().addNode(root().id, 2, 'button');
    const [row, textbox, button] = root().children!;
    s().moveNode(button.id, root().id, 1);
    expect(root().children!.map((n) => n.id)).toEqual([row.id, button.id, textbox.id]);
    s().moveNode(textbox.id, row.children![1].id, 0);
    expect(root().children![0].children![1].children![0].id).toBe(textbox.id);
    expect(root().children).toHaveLength(2);
  });

  it('moving down within the same parent lands after the gap it was dropped in', () => {
    for (const t of ['text', 'textbox', 'button'] as const) s().addNode(root().id, 99, t);
    const [a, b, c] = root().children!.map((n) => n.id);
    s().moveNode(a, root().id, 2); // gap between b and c
    expect(root().children!.map((n) => n.id)).toEqual([b, a, c]);
  });

  it('will not move a node inside itself', () => {
    s().addNode(root().id, 0, 'container');
    const box = root().children![0];
    s().addNode(box.id, 0, 'container');
    const inner = root().children![0].children![0];
    s().moveNode(box.id, inner.id, 0);
    expect(root().children![0].id).toBe(box.id);
  });
});

describe('remove, duplicate, row layout', () => {
  it('re-pins comments when their node is removed', () => {
    s().addNode(root().id, 0, 'container');
    const box = root().children![0];
    s().addNode(box.id, 0, 'textbox');
    const tb = root().children![0].children![0];
    s().addComment({ pageId: s().project.pages[0].id, anchorId: tb.id, x: 0.5, y: 0.5 });
    s().removeNode(box.id);
    expect(root().children).toHaveLength(0);
    expect(s().project.comments[0].anchorId).toBe(root().id);
    expect(s().selectedId).toBeNull();
  });

  it('duplicates with fresh ids', () => {
    s().addNode(root().id, 0, 'row');
    const row = root().children![0];
    s().duplicateNode(row.id);
    const [a, b] = root().children!;
    expect(b.id).not.toBe(a.id);
    expect(b.children![0].id).not.toBe(a.children![0].id);
    expect(s().selectedId).toBe(b.id);
  });

  it('changing a row to fewer columns keeps the contents', () => {
    s().addNode(root().id, 0, 'row');
    s().setRowLayout(root().children![0].id, [4, 4, 4]);
    const third = root().children![0].children![2];
    s().addNode(third.id, 0, 'button');
    s().setRowLayout(root().children![0].id, [12]);
    const cols = root().children![0].children!;
    expect(cols).toHaveLength(1);
    expect(cols[0].props.span).toBe(12);
    expect(cols[0].children![0].type).toBe('button');
  });
});

describe('undo and redo', () => {
  it('undoes and redoes structural changes', () => {
    s().addNode(root().id, 0, 'textbox');
    s().addNode(root().id, 1, 'button');
    s().undo();
    expect(root().children).toHaveLength(1);
    s().undo();
    expect(root().children).toHaveLength(0);
    s().redo();
    expect(root().children).toHaveLength(1);
  });

  it('collapses rapid edits to the same field into one step', () => {
    s().addNode(root().id, 0, 'textbox');
    const id = root().children![0].id;
    s().updateProps(id, { label: 'N' });
    s().updateProps(id, { label: 'Na' });
    s().updateProps(id, { label: 'Name' });
    expect(root().children![0].props.label).toBe('Name');
    s().undo();
    expect(root().children![0].props.label).toBe('Label');
  });
});

describe('files', () => {
  it('round-trips a project through JSON', () => {
    s().addNode(root().id, 0, 'dropdown');
    s().addComment({ pageId: s().project.pages[0].id, anchorId: root().id, x: 0.1, y: 0.2 });
    const back = parseProject(JSON.stringify(s().project));
    expect(back).toEqual(s().project);
  });

  it('rejects files that are not projects', () => {
    expect(() => parseProject('{"hello":1}')).toThrow(/not a wireframe/);
  });

  it('parses options with selected markers', () => {
    expect(parseOptions('*A\n B \n\nC')).toEqual([
      { label: 'A', on: true },
      { label: 'B', on: false },
      { label: 'C', on: false },
    ]);
  });
});
