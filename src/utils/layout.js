export function autoLayout(notes) {
  const cols = 6;
  const gapX = 260;
  const gapY = 220;
  const startX = 40;
  const startY = 120;

  const positions = {};
  notes.forEach((n, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    positions[n.id] = {
      x: startX + col * gapX + (i % 3) * 8,
      y: startY + row * gapY + (i % 5) * 6,
    };
  });
  return positions;
}
