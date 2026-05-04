import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COLORS, DEMO_NOTES, DEMO_POSITIONS, WEB_STATE_KEY } from "./constants.js";
import { NoteCard } from "./components/NoteCard.jsx";
import { useClickOutside } from "./hooks/useClickOutside.js";
import { autoLayout } from "./utils/layout.js";
import { isElectronAvailable } from "./utils/electron.js";
import { loadWebState, saveWebState } from "./utils/webStorage.js";
import { getNoteSearchHaystack } from "./utils/noteMedia.js";
import "./app.css";

export default function App() {
  const [importInfo, setImportInfo] = useState(null);
  const [notes, setNotes] = useState([]);
  const [positions, setPositions] = useState({});
  const [query, setQuery] = useState("");
  const saveTimer = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [openFilterBox, setOpenFilterBox] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [filterLogic, setFilterLogic] = useState("OR");

  const controlsRef = useRef(null);
  const closeFilterPanel = useCallback(() => setOpenFilterBox(false), []);
  useClickOutside(controlsRef, closeFilterPanel, openFilterBox);

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

      const web = loadWebState(WEB_STATE_KEY);
      if (web?.notes?.length) {
        setPositions(web.positions || {});
        setImportInfo(web.importInfo || null);
        setNotes(web.notes || []);
      } else {
        const seeded = {
          importInfo: { folder: "(web demo)", keepDir: "(web demo)", count: DEMO_NOTES.length },
          notes: DEMO_NOTES,
          positions: DEMO_POSITIONS,
        };
        setImportInfo(seeded.importInfo);
        setNotes(seeded.notes);
        setPositions(seeded.positions);
        saveWebState(WEB_STATE_KEY, seeded);
      }
    })();
  }, []);

  function scheduleSave(next) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (isElectronAvailable()) {
        await window.keepAPI.saveState(next);
      } else {
        saveWebState(WEB_STATE_KEY, next);
      }
    }, 250);
  }

  async function onImportClick() {
    if (!isElectronAvailable()) return;

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
      positions: nextPositions,
    };
    scheduleSave(nextState);
  }

  function loadDemoBoard() {
    const nextState = {
      importInfo: { folder: "(web demo)", keepDir: "(web demo)", count: DEMO_NOTES.length },
      notes: DEMO_NOTES,
      positions: DEMO_POSITIONS,
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
    } catch {
      /* ignore */
    }
    setImportInfo(null);
    setNotes([]);
    setPositions({});
    setQuery("");
    setSelectedLabels([]);
    setOpenFilterBox(false);
    setFilterLogic("OR");
  }

  const toggleLabel = useCallback((label) => {
    if (label === "ALL") {
      setSelectedLabels([]);
      return;
    }
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  }, []);

  const allLabels = useMemo(() => {
    const s = new Set();
    for (const n of notes) for (const l of n.labels || []) s.add(l);
    return ["ALL", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (selectedLabels.length > 0) {
        const noteLabels = n.labels || [];
        if (filterLogic === "OR") {
          if (!selectedLabels.some((l) => noteLabels.includes(l))) return false;
        } else if (!selectedLabels.every((l) => noteLabels.includes(l))) {
          return false;
        }
      }

      if (!q) return true;
      return getNoteSearchHaystack(n).includes(q);
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
  const electron = isElectronAvailable();

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

        <div className="controls" ref={controlsRef}>
          <button
            type="button"
            className="btn"
            disabled={!electron}
            title={
              electron
                ? "Choose your extracted Takeout or Keep folder"
                : "Import is only available in the desktop app. Use “Load Demo Notes” here."
            }
            onClick={onImportClick}
          >
            Import Keep…
          </button>

          {showWebDemoControls ? (
            <>
              <button type="button" className="btn" onClick={loadDemoBoard} title="Load a sample board for the web demo">
                Load Demo Notes
              </button>
              <button type="button" className="btn" onClick={resetWebDemo} title="Clear demo state (refresh to reseed)">
                Reset Demo
              </button>
            </>
          ) : null}

          <input
            className="search"
            placeholder="Search title, text, image alt, or file name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search notes"
          />
          <button
            type="button"
            className={`filter btn ${openFilterBox ? "active" : ""}`}
            aria-expanded={openFilterBox}
            aria-controls="note-filter-popover"
            id="note-filter-trigger"
            onClick={() => setOpenFilterBox((prev) => !prev)}
          >
            Filter Notes
          </button>
          <div
            className={`filter-section ${openFilterBox ? "active" : ""}`}
            id="note-filter-popover"
            role="region"
            aria-labelledby="note-filter-trigger"
            aria-hidden={!openFilterBox}
          >
            <div className="logic-toggle">
              <button
                type="button"
                className={`btn-toggle ${filterLogic === "OR" ? "active" : ""}`}
                onClick={() => setFilterLogic("OR")}
              >
                OR
              </button>
              <button
                type="button"
                className={`btn-toggle ${filterLogic === "AND" ? "active" : ""}`}
                onClick={() => setFilterLogic("AND")}
              >
                AND
              </button>
            </div>

            <div className="chips-container">
              {allLabels.map((l) => (
                <button
                  type="button"
                  key={l}
                  className={`chip-filter ${
                    selectedLabels.includes(l) || (l === "ALL" && selectedLabels.length === 0) ? "selected" : ""
                  }`}
                  onClick={() => toggleLabel(l)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div
        className="board"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "top left",
        }}
      >
        {filtered.map((n) => (
          <NoteCard
            key={n.id}
            note={n}
            position={positions[n.id]}
            colorClass={noteColor(n)}
            query={query}
            onDragStop={updatePosition}
            onLabelToggle={toggleLabel}
          />
        ))}
      </div>

      <div className="zoom-controls">
        <button type="button" onClick={() => setZoom((prev) => Math.min(prev + 0.1, 2))}>
          +
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((prev) => Math.max(prev - 0.1, 0.5))}>
          −
        </button>
      </div>
    </div>
  );
}
