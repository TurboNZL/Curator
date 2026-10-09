export interface Box { x: number; y: number; w: number; h: number }

/**
 * Bounding box of the "real" picture inside an image that has black bars (YouTube thumbnails letterbox
 * album art). A row/column counts as content when more than `minShare` of its pixels are brighter than
 * `threshold`, so a stray bright pixel or compression noise inside a bar does not count.
 */
export function contentBox(rgba: Uint8ClampedArray, w: number, h: number, threshold = 32, minShare = 0.02): Box {
  const bright = (i: number) => Math.max(rgba[i], rgba[i + 1], rgba[i + 2]) > threshold && rgba[i + 3] > 0;
  const rowOk = (y: number) => { let n = 0; for (let x = 0; x < w; x++) if (bright((y * w + x) * 4)) n++; return n > w * minShare; };
  const colOk = (x: number) => { let n = 0; for (let y = 0; y < h; y++) if (bright((y * w + x) * 4)) n++; return n > h * minShare; };
  let top = 0, bottom = h - 1, left = 0, right = w - 1;
  while (top < bottom && !rowOk(top)) top++;
  while (bottom > top && !rowOk(bottom)) bottom--;
  while (left < right && !colOk(left)) left++;
  while (right > left && !colOk(right)) right--;
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

/** Largest centred square inside a box. */
export function centreSquare(b: Box): Box {
  const s = Math.min(b.w, b.h);
  return { x: b.x + Math.floor((b.w - s) / 2), y: b.y + Math.floor((b.h - s) / 2), w: s, h: s };
}

/**
 * Crop to the picture's centre square, but only when bars were actually found and what is left is a
 * plausible cover (at least 100 px and 40% of the shorter side); otherwise keep the whole image.
 */
export function coverCrop(rgba: Uint8ClampedArray, w: number, h: number): Box {
  const whole: Box = { x: 0, y: 0, w, h };
  const box = contentBox(rgba, w, h);
  const sq = centreSquare(box);
  if (box.w >= w * 0.98 && box.h >= h * 0.98) return whole; // no bars
  return sq.w < 100 || sq.w < Math.min(w, h) * 0.4 ? whole : sq;
}
