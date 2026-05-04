export function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function normalizeImageSrc(src) {
  if (!src) return null;
  const raw = String(src).trim();
  if (!raw) return null;

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:") ||
    raw.startsWith("file://") ||
    raw.startsWith("/") ||
    raw.startsWith("./") ||
    raw.startsWith("../")
  ) {
    return raw;
  }

  if (/^[a-zA-Z]:[\\/]/.test(raw)) {
    return `file:///${raw.replace(/\\/g, "/")}`;
  }

  if (raw.startsWith("\\\\")) {
    return `file:${raw.replace(/\\/g, "/")}`;
  }

  return raw;
}

export function getNoteImages(note) {
  const candidates = [
    ...toArray(note?.image),
    ...toArray(note?.imageUrl),
    ...toArray(note?.imagePath),
    ...toArray(note?.thumbnail),
    ...toArray(note?.media),
    ...toArray(note?.attachments),
    ...toArray(note?.images),
  ];

  const seen = new Set();
  const output = [];

  for (const item of candidates) {
    let src = null;
    let alt = note?.title || "Note image";

    if (typeof item === "string") {
      src = item;
    } else if (item && typeof item === "object") {
      src =
        item.src ||
        item.url ||
        item.path ||
        item.file ||
        item.filePath ||
        item.image ||
        item.imageUrl ||
        item.thumbnail;

      alt = item.alt || item.caption || item.name || alt;
    }

    const normalized = normalizeImageSrc(src);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push({ src: normalized, alt });
  }

  return output;
}

/** Text used for search matching (title, body, image alt, src, filename). */
export function getNoteSearchHaystack(note) {
  const parts = [`${note.title || ""}`, `${note.text || ""}`];
  for (const im of getNoteImages(note)) {
    parts.push(String(im.alt || ""));
    parts.push(String(im.src || ""));
    const base = String(im.src || "").split(/[/\\]/).pop() || "";
    if (base) parts.push(base);
  }
  return parts.join("\n").toLowerCase();
}
