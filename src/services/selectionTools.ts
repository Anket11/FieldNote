export function selectionToolsPosition(rect: { left: number; right: number; top: number; bottom: number }, viewport: { width: number; height: number }, expanded = false) {
  const width = Math.min(370, viewport.width - 16);
  const height = expanded ? Math.min(380, viewport.height - 16) : 48;
  const above = rect.top >= height + 16;
  return { left: Math.max(8, Math.min((rect.left + rect.right - width) / 2, viewport.width - width - 8)),
    top: Math.max(8, Math.min(above ? rect.top - height - 8 : rect.bottom + 8, viewport.height - height - 8)), width, maxHeight: viewport.height - 16, side: above ? "above" : "below" };
}
