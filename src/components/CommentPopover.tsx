import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useProject } from '../store/useProject';
import { commentNumber } from './NodeViews';

const WIDTH = 270;

/** Editor for the open comment, floating next to its pin. */
export function CommentPopover() {
  const openId = useProject((s) => s.openCommentId);
  const comments = useProject((s) => s.project.comments);
  const comment = comments.find((c) => c.id === openId);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const close = () => {
    const s = useProject.getState();
    const c = s.project.comments.find((x) => x.id === s.openCommentId);
    if (c && !c.text.trim()) s.removeComment(c.id);
    s.openComment(null);
  };

  useLayoutEffect(() => {
    if (!openId) return setPos(null);
    const place = () => {
      const pin = document.querySelector(`.canvas-page [data-comment-id="${openId}"]`);
      if (!pin) return setPos(null);
      const r = pin.getBoundingClientRect();
      const left = r.right + 10 + WIDTH > window.innerWidth ? r.left - 10 - WIDTH : r.right + 10;
      setPos({ left: Math.max(8, left), top: Math.max(8, Math.min(r.top - 8, window.innerHeight - 220)) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [openId, comments]);

  useEffect(() => {
    if (!openId) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (box.current?.contains(t) || t.closest('.comment-pin, .comment-item')) return;
      close();
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [openId]);

  if (!comment || !pos) return null;
  const { updateComment, removeComment, openComment } = useProject.getState();
  return createPortal(
    <div className="comment-popover" ref={box} style={{ ...pos, width: WIDTH }} onKeyDown={(e) => e.key === 'Escape' && close()}>
      <div className="comment-popover-head">
        <span className="comment-num">{commentNumber(comments, comment)}</span>
        <span>Comment{comment.resolved ? ' · resolved' : ''}</span>
      </div>
      <textarea
        autoFocus
        rows={4}
        placeholder="Write a note…"
        value={comment.text}
        onChange={(e) => updateComment(comment.id, { text: e.target.value })}
      />
      <div className="comment-popover-actions">
        <button type="button" className="btn small danger" onClick={() => { removeComment(comment.id); openComment(null); }}>
          Delete
        </button>
        <button type="button" className="btn small" onClick={() => updateComment(comment.id, { resolved: !comment.resolved })}>
          {comment.resolved ? 'Reopen' : 'Resolve'}
        </button>
        <button type="button" className="btn small primary" onClick={close}>
          Done
        </button>
      </div>
    </div>,
    document.body,
  );
}
