import Draggable from "react-draggable";
import { NoteImage } from "./NoteImage.jsx";
import { getNoteImages } from "../utils/noteMedia.js";
import { renderRichNoteText, renderTitleWithSearch } from "../utils/searchAndLinks.jsx";

export function NoteCard({
  note,
  position,
  colorClass,
  query,
  onDragStop,
  onLabelToggle,
}) {
  const pos = position || { x: 60, y: 140 };
  const text = (note.text || "").trim() || "…";
  const images = getNoteImages(note);

  return (
    <Draggable
      position={{ x: pos.x ?? 60, y: pos.y ?? 140 }}
      onStop={(_, data) => onDragStop(note.id, data.x, data.y)}
      handle=".note-header"
    >
      <div className={`note note-${colorClass} ${images.length ? "note-has-image" : ""}`}>
        <div className="note-header">
          <div className="note-title">{renderTitleWithSearch(note.title, query)}</div>
        </div>

        <div className="note-body">
          {images.length ? (
            <div className="note-images">
              {images.map((image) => (
                <NoteImage key={image.src} image={image} title={note.title} />
              ))}
            </div>
          ) : null}

          <div className="note-text">{renderRichNoteText(text, query)}</div>
        </div>

        {(note.labels?.length || 0) > 0 ? (
          <div className="note-footer">
            {note.labels.map((label, idx) => (
              <button
                key={`${note.id}-${label}-${idx}`}
                type="button"
                className="chip"
                onClick={() => onLabelToggle(label)}
                title="Toggle this label in the filter"
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Draggable>
  );
}
