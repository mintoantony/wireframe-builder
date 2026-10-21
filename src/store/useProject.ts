import { create } from 'zustand';
import { canAccept, CATALOG, createNode, newId } from '../model/catalog';
import { cloneWithNewIds, collectIds, findNode, findParent } from '../model/tree';
import type { Device, NodeType, Page, Project, Props, WComment } from '../model/types';

const HISTORY_LIMIT = 100;
/** Edits to the same field within this window collapse into one undo step. */
const COALESCE_MS = 1000;

export type ExportKind = 'png' | 'pdf' | 'html';

export interface ExportJob {
  kind: ExportKind;
  includeComments: boolean;
  pageIds: string[];
}

export type RightTab = 'properties' | 'comments';

export interface ProjectState {
  project: Project;
  past: Project[];
  future: Project[];
  lastKey: string | null;
  lastTime: number;

  activePageId: string;
  selectedId: string | null;
  commentMode: boolean;
  showComments: boolean;
  openCommentId: string | null;
  device: Device;
  rightTab: RightTab;
  exportJob: ExportJob | null;

  addNode(parentId: string, index: number, type: NodeType): void;
  insertNear(type: NodeType): void;
  moveNode(id: string, parentId: string, index: number): void;
  removeNode(id: string): void;
  duplicateNode(id: string): void;
  updateProps(id: string, patch: Props): void;
  setRowLayout(rowId: string, spans: number[]): void;

  renameProject(name: string): void;
  addPage(): void;
  renamePage(id: string, name: string): void;
  removePage(id: string): void;
  setActivePage(id: string): void;

  addComment(c: Pick<WComment, 'pageId' | 'anchorId' | 'x' | 'y'>): string;
  updateComment(id: string, patch: Partial<Pick<WComment, 'text' | 'resolved'>>): void;
  removeComment(id: string): void;
  openComment(id: string | null): void;

  undo(): void;
  redo(): void;
  loadProject(project: Project): void;
  newProject(): void;

  select(id: string | null): void;
  setCommentMode(on: boolean): void;
  setShowComments(on: boolean): void;
  setDevice(device: Device): void;
  setRightTab(tab: RightTab): void;
  setExportJob(job: ExportJob | null): void;
}

export const STORAGE_KEY = 'wireframe-builder:project:v1';

export function emptyPage(name: string): Page {
  return { id: newId(), name, root: { id: newId(), type: 'page', props: {}, children: [] } };
}

export function emptyProject(): Project {
  return { version: 1, name: 'Untitled wireframe', pages: [emptyPage('Page 1')], comments: [] };
}

/** Parses a saved project, throwing a readable error if it is not one. */
export function parseProject(text: string): Project {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.pages) || data.pages.length === 0 || !data.pages.every((p: Page) => p?.root?.type === 'page')) {
    throw new Error('This file is not a wireframe project.');
  }
  return {
    version: 1,
    name: typeof data.name === 'string' ? data.name : 'Untitled wireframe',
    pages: data.pages,
    comments: Array.isArray(data.comments) ? data.comments : [],
  };
}

function loadSaved(): Project | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseProject(raw) : null;
  } catch {
    return null;
  }
}

function pageContaining(project: Project, nodeId: string): Page | undefined {
  return project.pages.find((p) => findNode(p.root, nodeId));
}

/** Drops UI references (selection, open comment, page) that no longer exist in the project. */
function reconcileUi(s: ProjectState, project: Project): Partial<ProjectState> {
  const activePageId = project.pages.some((p) => p.id === s.activePageId) ? s.activePageId : project.pages[0].id;
  const selectedId = s.selectedId && project.pages.some((p) => findNode(p.root, s.selectedId!)) ? s.selectedId : null;
  const openCommentId = s.openCommentId && project.comments.some((c) => c.id === s.openCommentId) ? s.openCommentId : null;
  return { activePageId, selectedId, openCommentId };
}

const initial = loadSaved() ?? emptyProject();

export const useProject = create<ProjectState>()((set, get) => {
  /** Applies a change to a copy of the project and records an undo step. Return false from the recipe to cancel. */
  const commit = (recipe: (draft: Project) => void | false, key?: string) => {
    const s = get();
    const draft = structuredClone(s.project);
    if (recipe(draft) === false) return false;
    const now = Date.now();
    const coalesce = key !== undefined && key === s.lastKey && now - s.lastTime < COALESCE_MS;
    set({
      project: draft,
      past: coalesce ? s.past : [...s.past, s.project].slice(-HISTORY_LIMIT),
      future: [],
      lastKey: key ?? null,
      lastTime: now,
      ...reconcileUi(s, draft),
    });
    return true;
  };

  return {
    project: initial,
    past: [],
    future: [],
    lastKey: null,
    lastTime: 0,

    activePageId: initial.pages[0].id,
    selectedId: null,
    commentMode: false,
    showComments: true,
    openCommentId: null,
    device: 'desktop',
    rightTab: 'properties',
    exportJob: null,

    addNode(parentId, index, type) {
      const node = createNode(type);
      const ok = commit((d) => {
        const page = pageContaining(d, parentId);
        const parent = page && findNode(page.root, parentId);
        if (!parent || !canAccept(parent.type, type)) return false;
        parent.children ??= [];
        parent.children.splice(Math.max(0, Math.min(index, parent.children.length)), 0, node);
      });
      if (ok) set({ selectedId: node.id, rightTab: 'properties' });
    },

    insertNear(type) {
      const s = get();
      const page = s.project.pages.find((p) => p.id === s.activePageId)!;
      const sel = s.selectedId ? findNode(page.root, s.selectedId) : null;
      if (sel && CATALOG[sel.type].container && canAccept(sel.type, type)) {
        return s.addNode(sel.id, sel.children?.length ?? 0, type);
      }
      const loc = sel ? findParent(page.root, sel.id) : null;
      if (loc && canAccept(loc.parent.type, type)) return s.addNode(loc.parent.id, loc.index + 1, type);
      if (canAccept('page', type)) s.addNode(page.root.id, page.root.children?.length ?? 0, type);
    },

    moveNode(id, parentId, index) {
      commit((d) => {
        const page = pageContaining(d, id);
        if (!page) return false;
        const node = findNode(page.root, id);
        const target = findNode(page.root, parentId);
        if (!node || !target || !canAccept(target.type, node.type)) return false;
        if (findNode(node, parentId)) return false; // would move a node inside itself
        const from = findParent(page.root, id);
        if (!from) return false;
        let to = index;
        if (from.parent.id === parentId && from.index < index) to--;
        if (from.parent.id === parentId && from.index === to) return false;
        from.parent.children!.splice(from.index, 1);
        target.children ??= [];
        target.children.splice(to, 0, node);
      });
    },

    removeNode(id) {
      commit((d) => {
        const page = pageContaining(d, id);
        if (!page || page.root.id === id) return false;
        const loc = findParent(page.root, id)!;
        const removed = collectIds(loc.parent.children![loc.index]);
        loc.parent.children!.splice(loc.index, 1);
        // Keep comments that pointed into the removed part by re-pinning them to its parent.
        for (const c of d.comments) if (removed.has(c.anchorId)) c.anchorId = loc.parent.id;
      });
    },

    duplicateNode(id) {
      let copyId: string | null = null;
      commit((d) => {
        const page = pageContaining(d, id);
        const loc = page && findParent(page.root, id);
        if (!loc) return false;
        const copy = cloneWithNewIds(loc.parent.children![loc.index]);
        copyId = copy.id;
        loc.parent.children!.splice(loc.index + 1, 0, copy);
      });
      if (copyId) set({ selectedId: copyId });
    },

    updateProps(id, patch) {
      commit((d) => {
        const page = pageContaining(d, id);
        const node = page && findNode(page.root, id);
        if (!node) return false;
        node.props = { ...node.props, ...patch };
      }, `props:${id}:${Object.keys(patch).join(',')}`);
    },

    setRowLayout(rowId, spans) {
      commit((d) => {
        const page = pageContaining(d, rowId);
        const row = page && findNode(page.root, rowId);
        if (!row || row.type !== 'row' || spans.length === 0) return false;
        const cols = (row.children ??= []);
        while (cols.length < spans.length) cols.push(createNode('column'));
        if (cols.length > spans.length) {
          // Fold the contents of dropped columns into the last one that stays.
          const keep = cols[spans.length - 1];
          for (const extra of cols.splice(spans.length)) {
            keep.children = [...(keep.children ?? []), ...(extra.children ?? [])];
            for (const c of d.comments) if (c.anchorId === extra.id) c.anchorId = keep.id;
          }
        }
        cols.forEach((col, i) => (col.props = { ...col.props, span: spans[i] }));
      });
    },

    renameProject(name) {
      commit((d) => void (d.name = name), 'project-name');
    },

    addPage() {
      const page = emptyPage(`Page ${get().project.pages.length + 1}`);
      commit((d) => void d.pages.push(page));
      set({ activePageId: page.id, selectedId: null });
    },

    renamePage(id, name) {
      commit((d) => {
        const page = d.pages.find((p) => p.id === id);
        if (!page) return false;
        page.name = name;
      }, `page-name:${id}`);
    },

    removePage(id) {
      commit((d) => {
        if (d.pages.length <= 1) return false;
        d.pages = d.pages.filter((p) => p.id !== id);
        d.comments = d.comments.filter((c) => c.pageId !== id);
      });
    },

    setActivePage(id) {
      set({ activePageId: id, selectedId: null, openCommentId: null });
    },

    addComment(c) {
      const comment: WComment = { ...c, id: newId(), text: '', resolved: false, createdAt: Date.now() };
      commit((d) => void d.comments.push(comment));
      set({ openCommentId: comment.id, showComments: true });
      return comment.id;
    },

    updateComment(id, patch) {
      commit((d) => {
        const c = d.comments.find((x) => x.id === id);
        if (!c) return false;
        Object.assign(c, patch);
      }, `comment:${id}:${Object.keys(patch).join(',')}`);
    },

    removeComment(id) {
      commit((d) => void (d.comments = d.comments.filter((c) => c.id !== id)));
    },

    openComment(id) {
      set({ openCommentId: id });
    },

    undo() {
      const s = get();
      const prev = s.past[s.past.length - 1];
      if (!prev) return;
      set({ project: prev, past: s.past.slice(0, -1), future: [s.project, ...s.future], lastKey: null, ...reconcileUi(s, prev) });
    },

    redo() {
      const s = get();
      const next = s.future[0];
      if (!next) return;
      set({ project: next, past: [...s.past, s.project], future: s.future.slice(1), lastKey: null, ...reconcileUi(s, next) });
    },

    loadProject(project) {
      set({ project, past: [], future: [], lastKey: null, activePageId: project.pages[0].id, selectedId: null, openCommentId: null });
    },

    newProject() {
      get().loadProject(emptyProject());
    },

    select(id) {
      set({ selectedId: id, ...(id ? { rightTab: 'properties' as const } : {}) });
    },
    setCommentMode(on) {
      set({ commentMode: on, ...(on ? { showComments: true } : {}) });
    },
    setShowComments(on) {
      set({ showComments: on, ...(on ? {} : { openCommentId: null }) });
    },
    setDevice(device) {
      set({ device });
    },
    setRightTab(tab) {
      set({ rightTab: tab });
    },
    setExportJob(job) {
      set({ exportJob: job });
    },
  };
});

export function useActivePage(): Page {
  return useProject((s) => s.project.pages.find((p) => p.id === s.activePageId) ?? s.project.pages[0]);
}

/** Saves the project to localStorage shortly after each change. */
export function startAutosave() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return useProject.subscribe((s, prev) => {
    if (s.project === prev.project) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s.project));
      } catch {
        // Storage full or blocked: the user can still save to a file.
      }
    }, 300);
  });
}
