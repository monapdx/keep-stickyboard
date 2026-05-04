import { escapeRegExp } from "./escapeRegExp.js";

// Same URL heuristic as before: split plain text vs link segments, then highlight only inside strings.
const URL_SOURCE = "((https?:\\/\\/|www\\.)[^\\s<>()]+[^\\s<>().,!?;:\"')\\]])";

function highlightPlainSegments(str, query) {
  const q = (query || "").trim();
  if (!q) return str;

  const re = new RegExp(`(${escapeRegExp(q)})`, "gi");
  const parts = String(str).split(re);

  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={`mk-${i}`} className="search-highlight">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/** Note body: linkify URLs, apply search highlights without breaking anchors. */
export function renderRichNoteText(text, query) {
  const input = String(text ?? "");
  const q = (query || "").trim();
  const urlRe = new RegExp(URL_SOURCE, "gi");
  const segments = input.split(urlRe);

  return segments.map((part, i) => {
    if (!part) return null;

    urlRe.lastIndex = 0;
    const isUrl = urlRe.test(part);

    if (isUrl) {
      const href = part.startsWith("http") ? part : `https://${part}`;
      const children = q ? highlightPlainSegments(part, q) : part;
      return (
        <a
          key={`url-${i}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </a>
      );
    }

    const body = q ? highlightPlainSegments(part, q) : part;
    return (
      <span key={`txt-${i}`}>
        {body}
      </span>
    );
  });
}

export function renderTitleWithSearch(title, query) {
  const t = title?.trim() ? title : "(untitled)";
  const q = (query || "").trim();
  if (!q) return t;
  return highlightPlainSegments(t, q);
}
