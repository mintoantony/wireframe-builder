# Wireframe Builder

Drag-and-drop low-fidelity wireframes in the browser.

- `npm install`, then `npm run dev` and open http://localhost:5173
- `npm run build` creates one self-contained file, `dist/index.html`. You can open it by double-clicking or share it.
- `npm test` runs the store tests.

## Using it
- **Add:** drag from the left panel, or double-click an item to add it next to the selected one.
- **Layout:** put a **Row** inside a **Container**, choose a column layout in the right panel, then drop controls into the columns.
- **Edit:** click something to edit it in the right panel. `Del` deletes, `Ctrl+D` duplicates, `Ctrl+Z`/`Ctrl+Y` undo and redo.
- **Comments:** press `C` (or click **Comment**) and click anywhere on the page to drop a numbered note. **Show comments** shows and hides them, and the **Comments** tab lists them all.
- **Export:** PNG (this page), PDF/Print and HTML (all pages), or a `.wireframe.json` project file that you can re-open with **Open**. Each export can include or leave out the comments.
- Work is autosaved in this browser. Use **Save** to keep a file.

## Adding a control
Add an entry to `src/model/catalog.ts` and a `case` to `src/components/controls.tsx`.
