import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Draw a long list a piece at a time: the first `size` items at once, then `size` more each time the sentinel comes within 600 px of
 * the viewport (or when more() is called by a "Show more" button). `resetKey` (a different playlist, a new search) starts over, so
 * switching lists never draws the whole new one in a single frame.
 */
export function useChunks(total: number, size: number, resetKey: unknown) {
  const [shown, setShown] = useState(size);
  useEffect(() => setShown(size), [resetKey, size]);
  const more = useCallback(() => setShown((n) => Math.min(total, n + size)), [total, size]);
  const observer = useRef<IntersectionObserver | null>(null);
  /** put on an element after the last drawn item */
  const sentinel = useCallback((el: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    observer.current = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) more(); }, { rootMargin: '600px' });
    observer.current.observe(el);
  }, [more]);
  const count = Math.min(shown, total);
  return { shown: count, left: Math.max(0, total - count), more, sentinel };
}
