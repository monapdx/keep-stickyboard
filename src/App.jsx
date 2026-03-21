import { useEffect, useMemo, useRef, useState } from "react";
import Draggable from "react-draggable";
import "./app.css";

const COLORS = {
  yellow: true,
  orange: true,
  red: true,
  green: true,
  teal: true,
  blue: true,
  purple: true,
  gray: true
};

// Web demo localStorage key
const WEB_STATE_KEY = "keep_sticky_board_state_v1";

// Demo notes for browser build (same shape as imported notes)
const DEMO_NOTES = [
  {
    id: "demo-1",
    title: "Welcome 👋",
    text: "This is the *web demo* of Keep Sticky Board.\n\nDrag me by my title bar.",
    color: "yellow",
    labels: ["demo", "welcome","ss","s","e","t"]
  },
  {
    id: "demo-2",
    title: "How it works",
    text: "• Notes are draggable\n• Labels filter on the right\n• Search works\n• Images now render inline\n\nDesktop app can import Google Keep Takeout.",
    color: "teal",
    labels: ["demo"]
  },
  {
    id: "demo-3",
    title: "Try links",
    text: "Linkify test:\nhttps://github.com/monapdx/keep-stickyboard\n\n(Clicking won’t start a drag.)",
    color: "purple",
    labels: ["demo", "links"]
  },
  {
    id: "demo-4",
    title: "Example label",
    text: "Click a label chip to filter.\nThen set dropdown back to ALL.",
    color: "orange",
    labels: ["demo", "labels"]
  },
  {
    id: "demo-5",
    title: "Image support",
    text: "If a note includes an image field, it shows up right inside the sticky note.",
    color: "green",
    labels: ["demo", "images"],
    image: "/social.png"
  }
];

const DEMO_POSITIONS = {
  "demo-1": { x: 70, y: 140 },
  "demo-2": { x: 360, y: 180 },
  "demo-3": { x: 140, y: 420 },
  "demo-4": { x: 560, y: 360 },
  "demo-5": { x: 840, y: 150 }
};

function autoLayout(notes) {
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
      y: startY + row * gapY + (i % 5) * 6
    };
  });
  return positions;
}

function highlightSearchMatches(content, query) {
  if (!query || !query.trim()) return content;

  const q = query.trim();
  // String check aur safe conversion
  const input = String(content ?? "");
  const parts = input.split(new RegExp(`(${q})`, "gi"));

  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="search-highlight">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function linkifyText(text) {
  const input = String(text ?? "");
  const urlRegex = /((https?:\/\/|www\.)[^\s<>()]+[^\s<>().,!?;:"')\]])/gi;
  const parts = input.split(urlRegex);

  return parts.map((part, i) => {
    if (!part) return null;

    const isUrl = urlRegex.test(part);
    urlRegex.lastIndex = 0;

    if (!isUrl) return part;

    const href = part.startsWith("http") ? part : `https://${part}`;
    return (
      <a
        key={`url-${i}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </a>
    );
  });
}

function isElectronAvailable() {
  // Your preload exposes window.keepAPI in Electron.
  return typeof window !== "undefined" && !!window.keepAPI;
}

function loadWebState() {
  try {
    const raw = localStorage.getItem(WEB_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveWebState(next) {
  try {
    localStorage.setItem(WEB_STATE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeImageSrc(src) {
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

  // Windows absolute path -> file URL for Electron renderer.
  if (/^[a-zA-Z]:[\\/]/.test(raw)) {
    return `file:///${raw.replace(/\\/g, "/")}`;
  }

  // UNC / network path
  if (raw.startsWith("\\\\")) {
    return `file:${raw.replace(/\\/g, "/")}`;
  }

  return raw;
}

function getNoteImages(note) {
  const candidates = [
    ...toArray(note?.image),
    ...toArray(note?.imageUrl),
    ...toArray(note?.imagePath),
    ...toArray(note?.thumbnail),
    ...toArray(note?.media),
    ...toArray(note?.attachments),
    ...toArray(note?.images)
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

function NoteImage({ image, title }) {
  const [failed, setFailed] = useState(false);

  if (!image?.src || failed) return null;

  return (
    <div className="note-image-wrap">
      <img
        className="note-image"
        src={image.src}
        alt={image.alt || title || "Note image"}
        loading="lazy"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default function App() {
  const [importInfo, setImportInfo] = useState(null);
  const [notes, setNotes] = useState([]);
  const [positions, setPositions] = useState({});
  const [query, setQuery] = useState("");
  const saveTimer = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [openFilterBox,setOpenFilterBox] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [filterLogic, setFilterLogic] = useState("OR");

  // Initial load:
  // - Electron: load from keepAPI
  // - Web: load from localStorage, else seed demo (optional)
  useEffect(() => {
    (async () => {
      if (isElectronAvailable()) {
        const res = await window.keepAPI.loadState();
        if (res?.ok && res.data) {
          setPositions(res.data.positions || {});
          setImportInfo(res.data.importInfo || null);
          setNotes(res.data.notes || []);
        }
        return;
      }

      // Web demo path
      const web = loadWebState();
      if (web?.notes?.length) {
        setPositions(web.positions || {});
        setImportInfo(web.importInfo || null);
        setNotes(web.notes || []);
      } else {
        // Start the demo with a few notes so it doesn’t look empty
        const seeded = {
          importInfo: { folder: "(web demo)", keepDir: "(web demo)", count: DEMO_NOTES.length },
          notes: DEMO_NOTES,
          positions: DEMO_POSITIONS
        };
        setImportInfo(seeded.importInfo);
        setNotes(seeded.notes);
        setPositions(seeded.positions);
        saveWebState(seeded);
      }
    })();
  }, []);

  function scheduleSave(next) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (isElectronAvailable()) {
        await window.keepAPI.saveState(next);
      } else {
        saveWebState(next);
      }
    }, 250);
  }

  async function onImportClick() {
    if (!isElectronAvailable()) {
      alert("Import only works in the Electron desktop app.\n\nFor the web demo, use “Load Demo Notes”.");
      return;
    }

    const folder = await window.keepAPI.pickKeepFolder();
    if (!folder) return;

    const res = await window.keepAPI.importKeep(folder);
    if (!res.ok) {
      alert(res.error || "Import failed");
      return;
    }

    const parsed = res.data;
    setImportInfo({ folder, keepDir: parsed.keepDir, count: parsed.count });
    setNotes(parsed.notes);

    const existing = positions || {};
    const missing = parsed.notes.filter((n) => !existing[n.id]);
    const auto = autoLayout(missing);

    const nextPositions = { ...existing, ...auto };
    setPositions(nextPositions);

    const nextState = {
      importInfo: { folder, keepDir: parsed.keepDir, count: parsed.count },
      notes: parsed.notes,
      positions: nextPositions
    };
    scheduleSave(nextState);
  }

  function loadDemoBoard() {
    const nextState = {
      importInfo: { folder: "(web demo)", keepDir: "(web demo)", count: DEMO_NOTES.length },
      notes: DEMO_NOTES,
      positions: DEMO_POSITIONS
    };
    setImportInfo(nextState.importInfo);
    setNotes(nextState.notes);
    setPositions(nextState.positions);
    scheduleSave(nextState);
  }

  function resetWebDemo() {
    if (isElectronAvailable()) return;
    try {
      localStorage.removeItem(WEB_STATE_KEY);
    } catch {}
    setImportInfo(null);
    setNotes([]);
    setPositions({});
    setQuery("");
    setActiveLabel("ALL");
  }

  const toggleLabel = (label) => {
  if (label === "ALL") {
    setSelectedLabels([]);
    return;
  }
  setSelectedLabels(prev => 
    prev.includes(label) 
      ? prev.filter(l => l !== label)
      : [...prev, label]
  );
};

  const allLabels = useMemo(() => {
    const s = new Set();
    for (const n of notes) for (const l of n.labels || []) s.add(l);
    return ["ALL", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [notes]);

  const filtered = useMemo(() => {
  const q = query.trim().toLowerCase();
  return notes.filter((n) => {
    // Label Filter Logic
    if (selectedLabels.length > 0) {
      const noteLabels = n.labels || [];
      if (filterLogic === "OR") {
        if (!selectedLabels.some(l => noteLabels.includes(l))) return false;
      } else {
        if (!selectedLabels.every(l => noteLabels.includes(l))) return false;
      }
    }

    if (!q) return true;
    const hay = `${n.title || ""}\n${n.text || ""}`.toLowerCase();
    return hay.includes(q);
  });
}, [notes, query, selectedLabels, filterLogic]);

  function noteColor(n) {
    const c = String(n.color || "").toLowerCase();
    return COLORS[c] ? c : "yellow";
  }

  function updatePosition(id, x, y) {
    const nextPositions = { ...positions, [id]: { ...(positions[id] || {}), x, y } };
    setPositions(nextPositions);

    const nextState = { importInfo, notes, positions: nextPositions };
    scheduleSave(nextState);
  }

  const showWebDemoControls = !isElectronAvailable();

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">🗒️</div>
          <div className="titles">
            <div className="title">Keep Sticky Board</div>
            <div className="subtitle">
              {importInfo ? `Imported: ${importInfo.count} notes` : "Import your Google Keep Takeout"}
            </div>
          </div>
        </div>

        <div className="controls">
          <button className="btn" onClick={onImportClick}>Import Keep…</button>

          {showWebDemoControls ? (
            <>
              <button className="btn" onClick={loadDemoBoard} title="Load a sample board for the web demo">
                Load Demo Notes
              </button>
              <button className="btn" onClick={resetWebDemo} title="Clear demo state (refresh to reseed)">
                Reset Demo
              </button>
            </>
          ) : null}

          <input
            className="search"
            placeholder="Search title, text, or image name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className={`filter btn ${openFilterBox ? "active" : ""}`} onClick={()=>setOpenFilterBox(prev=>!prev)}>Filter Notes</button>
          <div className={`filter-section ${openFilterBox? "active" : ""}`}>
            {/* Logic Toggle: AND vs OR */}
            <div className="logic-toggle">
              <button 
                className={`btn-toggle ${filterLogic === 'OR' ? 'active' : ''}`}
                onClick={() => setFilterLogic('OR')}
              > OR </button>
              <button 
                className={`btn-toggle ${filterLogic === 'AND' ? 'active' : ''}`}
                onClick={() => setFilterLogic('AND')}
              > AND </button>
            </div>

            {/* Multi-select Chips */}
            <div className="chips-container">
              {allLabels.map((l) => (
                <button
                  key={l}
                  className={`chip-filter ${selectedLabels.includes(l) || (l === "ALL" && selectedLabels.length === 0) ? "selected" : ""}`}
                  onClick={() => toggleLabel(l)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>      
      <div className="board" style={{
        transform: `scale(${zoom})`, 
        transformOrigin: '1'
      }}>
        {filtered.map((n) => {
          const pos = positions[n.id] || { x: 60, y: 140 };
          const c = noteColor(n);
          const text = ((n.text || "").trim() || "…");
          const images = getNoteImages(n);

          return (
            <Draggable
              key={n.id}
              position={{ x: pos.x ?? 60, y: pos.y ?? 140 }}
              onStop={(_, data) => updatePosition(n.id, data.x, data.y)}
              handle=".note-header"
            >
              <div className={`note note-${c} ${images.length ? "note-has-image" : ""}`}>
                <div className="note-header">
                <div className="note-title">{highlightSearchMatches(n.title || "(untitled)", query)}</div>
                </div>

                <div className="note-body">
                  {images.length ? (
                    <div className="note-images">
                      {images.map((image) => (
                        <NoteImage key={image.src} image={image} title={n.title} />
                      ))}
                    </div>
                  ) : null}

                <div className="note-text">{highlightSearchMatches(linkifyText(text), query)}</div>
                </div>

                {(n.labels?.length || 0) > 0 ? (
                  <div className="note-footer">
                    {n.labels.map((l) => (
                      <button key={l} className="chip" onClick={() => setActiveLabel(l)} title="Filter by label">
                        {l}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </Draggable>
          );
        })}
      </div>
      {/* Zoom in/out */}
        <div className="zoom-controls">
          <button onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))}>+</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}>-</button>
        </div>
    </div>
  );
}
