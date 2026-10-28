export function sourcePlacement(anchor: { left: number; top: number; bottom: number }, viewport: { width: number; height: number }) {
  const margin = 12;
  const gap = 8;
  const width = Math.min(480, Math.max(0, viewport.width - margin * 2));
  const height = Math.min(420, Math.max(0, viewport.height - margin * 2));
  const below = viewport.height - anchor.bottom - margin;
  const above = anchor.top - margin;
  const side = below >= height + gap || below >= above ? "below" : "above";
  return { width, height, side,
    left: Math.max(margin, Math.min(anchor.left, viewport.width - width - margin)),
    top: Math.max(margin, Math.min(side === "below" ? anchor.bottom + gap : anchor.top - height - gap, viewport.height - height - margin)),
  };
}
