import { useState } from "react";

export function NoteImage({ image, title }) {
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
