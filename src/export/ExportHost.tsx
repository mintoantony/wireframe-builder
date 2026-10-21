import { toPng } from 'html-to-image';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ExportModeContext, commentNumber, Pins, StaticNode } from '../components/NodeViews';
import type { Project } from '../model/types';
import { useProject, type ExportJob } from '../store/useProject';
import { downloadBlob, downloadUrl, slug } from './download';

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

function collectCss(): string {
  return Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');
}

const STANDALONE_CSS = `
html, body { height: auto !important; overflow: auto !important; }
body { background: #e9e9ec; margin: 0; padding: 24px; }
.export-page { margin: 0 auto 32px; box-shadow: 0 1px 4px rgba(0,0,0,.12); }
`;

async function run(job: ExportJob, root: HTMLElement, project: Project) {
  const base = slug(project.name);
  if (job.kind === 'png') {
    const section = root.querySelector<HTMLElement>('.export-page')!;
    const url = await toPng(section, { backgroundColor: '#ffffff', pixelRatio: 2 });
    const page = project.pages.find((p) => p.id === job.pageIds[0]);
    downloadUrl(`${base}-${slug(page?.name ?? 'page')}.png`, url);
  } else if (job.kind === 'html') {
    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(project.name)}</title>
<style>${collectCss()}${STANDALONE_CSS}</style></head>
<body>${root.innerHTML}</body></html>`;
    downloadBlob(`${base}.html`, new Blob([html], { type: 'text/html' }));
  } else {
    window.print();
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/** Renders the pages being exported off-screen (or for print), then runs the export. */
export function ExportHost() {
  const job = useProject((s) => s.exportJob);
  const project = useProject((s) => s.project);
  const device = useProject((s) => s.device);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!job) return;
    (async () => {
      await nextFrame();
      await nextFrame();
      try {
        await run(job, ref.current!, useProject.getState().project);
      } catch (err) {
        console.error(err);
        alert(`Export failed: ${err instanceof Error ? err.message : err}`);
      } finally {
        useProject.getState().setExportJob(null);
      }
    })();
  }, [job]);

  if (!job) return null;
  const pages = project.pages.filter((p) => job.pageIds.includes(p.id));
  return createPortal(
    <ExportModeContext.Provider value={{ includeComments: job.includeComments }}>
      <div className="export-root" ref={ref}>
        {pages.map((page) => {
          const comments = project.comments.filter((c) => c.pageId === page.id);
          return (
            <section className="export-page" key={page.id}>
              <div className="export-page-title">
                {project.name} — {page.name}
              </div>
              <div className={`page-frame device-${device}`}>
                {page.root.children?.map((c) => <StaticNode key={c.id} node={c} />)}
                <Pins anchorId={page.root.id} />
              </div>
              {job.includeComments && comments.length > 0 ? (
                <ol className="export-legend">
                  {comments.map((c) => (
                    <li key={c.id} className={c.resolved ? 'resolved' : ''}>
                      <span className="comment-num">{commentNumber(project.comments, c)}</span>
                      <span>
                        {c.text || <i>Empty comment</i>}
                        {c.resolved ? ' (resolved)' : ''}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </section>
          );
        })}
      </div>
    </ExportModeContext.Provider>,
    document.body,
  );
}
