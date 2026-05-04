const path = require("path");
const fs = require("fs");

const YIELD_EVERY = 400;

function fileExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Walks the tree asynchronously and yields to the event loop every YIELD_EVERY files
 * so large Takeout folders do not block the main process for as long in one chunk.
 */
async function collectFilesAsync(rootDir) {
  const results = [];
  let fileCount = 0;

  async function walk(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        results.push(full);
        fileCount += 1;
        if (fileCount % YIELD_EVERY === 0) {
          await new Promise((r) => setImmediate(r));
        }
      }
    }
  }

  await walk(rootDir);
  return results;
}

function extractText(note) {
  if (typeof note.textContent === "string" && note.textContent.trim()) {
    return note.textContent;
  }

  if (Array.isArray(note.listContent)) {
    return note.listContent
      .map((item) => {
        if (!item) return "";
        const text = item.text || "";
        const checked = item.isChecked ? "[x] " : "[ ] ";
        return checked + text;
      })
      .filter(Boolean)
      .join("\n");
  }

  if (typeof note.text === "string") return note.text;
  return "";
}

function extractLabels(note) {
  if (!Array.isArray(note.labels)) return [];
  return note.labels
    .map((l) => {
      if (typeof l === "string") return l;
      if (l && typeof l.name === "string") return l.name;
      return null;
    })
    .filter(Boolean);
}

function resolvePossibleImage(baseDir, rawPath) {
  if (!rawPath || typeof rawPath !== "string") return null;

  if (path.isAbsolute(rawPath) && fileExists(rawPath)) return rawPath;

  const cleaned = rawPath.replace(/^\.?[\\/]/, "");
  const candidate = path.join(baseDir, cleaned);
  if (fileExists(candidate)) return candidate;

  return null;
}

function extractImages(note, jsonPath) {
  const baseDir = path.dirname(jsonPath);
  const out = [];
  const seen = new Set();

  const pushImage = (p) => {
    if (!p) return;
    const normalized = path.normalize(p);
    if (seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  };

  const directFields = [
    note.image,
    note.imagePath,
    note.imageUrl,
    note.thumbnail,
  ];

  for (const item of directFields) {
    if (typeof item === "string") {
      pushImage(resolvePossibleImage(baseDir, item) || item);
    }
  }

  const collections = [note.images, note.attachments, note.media];

  for (const coll of collections) {
    if (!Array.isArray(coll)) continue;
    for (const item of coll) {
      if (typeof item === "string") {
        pushImage(resolvePossibleImage(baseDir, item) || item);
      } else if (item && typeof item === "object") {
        pushImage(
          resolvePossibleImage(
            baseDir,
            item.path ||
              item.filePath ||
              item.file ||
              item.src ||
              item.url ||
              item.image ||
              item.imageUrl ||
              item.thumbnail
          ) ||
            item.path ||
            item.filePath ||
            item.file ||
            item.src ||
            item.url ||
            item.image ||
            item.imageUrl ||
            item.thumbnail
        );
      }
    }
  }

  const parsed = path.parse(jsonPath);
  const sidecarExts = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
  for (const ext of sidecarExts) {
    const sidecar = path.join(parsed.dir, parsed.name + ext);
    if (fileExists(sidecar)) pushImage(sidecar);
  }

  return out;
}

function isLikelyKeepNote(note) {
  if (!note || typeof note !== "object") return false;
  return (
    "title" in note ||
    "textContent" in note ||
    "listContent" in note ||
    "labels" in note
  );
}

/** Prefer Keep `id`; otherwise a path-based id with `/` separators so the same export matches across OSes. */
function noteId(folder, file, rawId) {
  if (rawId != null && String(rawId).trim() !== "") return String(rawId);
  return path.relative(folder, file).split(path.sep).join("/");
}

async function importKeepFolder(folder) {
  const allFiles = await collectFilesAsync(folder);
  const jsonFiles = allFiles.filter((f) => f.toLowerCase().endsWith(".json"));

  const notes = [];

  for (let i = 0; i < jsonFiles.length; i++) {
    const file = jsonFiles[i];
    if (i > 0 && i % YIELD_EVERY === 0) {
      await new Promise((r) => setImmediate(r));
    }

    const raw = safeReadJson(file);
    if (!isLikelyKeepNote(raw)) continue;

    const title = (raw.title || "").trim();
    const text = extractText(raw);
    const labels = extractLabels(raw);
    const color = (raw.color || "yellow").toLowerCase();

    const images = extractImages(raw, file);

    notes.push({
      id: noteId(folder, file, raw.id),
      title: title || "(untitled)",
      text,
      labels,
      color,
      images,
    });
  }

  return {
    keepDir: folder,
    count: notes.length,
    notes,
  };
}

module.exports = {
  importKeepFolder,
  extractText,
  extractLabels,
  extractImages,
  isLikelyKeepNote,
  noteId,
  fileExists,
  resolvePossibleImage,
};
