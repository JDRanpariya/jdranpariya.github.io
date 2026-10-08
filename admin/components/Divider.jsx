import React, { useState } from "react";
export function Divider({ kind, value, onChange, workspace }) {
  const [active, setActive] = useState(false);
  const files = kind === "files";
  function move(event) {
    if (!active) return;
    const rect = workspace.current.getBoundingClientRect();
    onChange(
      files
        ? Math.max(180, Math.min(420, rect.width * 0.4, event.clientX - rect.left))
        : Math.max(
            0.25,
            Math.min(
              0.75,
              (event.clientX -
                event.currentTarget.parentElement
                  .querySelector(".admin-editor")
                  .getBoundingClientRect().left) /
                (rect.right -
                  event.currentTarget.parentElement
                    .querySelector(".admin-editor")
                    .getBoundingClientRect().left)
            )
          )
    );
  }
  return (
    <div
      className="admin-divider"
      id={`admin-${files ? "files" : "preview"}-divider`}
      role="separator"
      tabIndex={0}
      aria-label={files ? "Resize file panel" : "Resize editor and preview"}
      aria-orientation="vertical"
      aria-valuemin={files ? 180 : 25}
      aria-valuemax={files ? 420 : 75}
      aria-valuenow={files ? Math.round(value) : Math.round(value * 100)}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setActive(true);
        workspace.current.classList.add("is-resizing");
      }}
      onPointerMove={move}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        setActive(false);
        workspace.current.classList.remove("is-resizing");
      }}
      onPointerCancel={() => {
        setActive(false);
        workspace.current.classList.remove("is-resizing");
      }}
      onDoubleClick={() => onChange(files ? 260 : 0.5)}
      onKeyDown={(e) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
        e.preventDefault();
        const min = files ? 180 : 0.25,
          max = files ? 420 : 0.75;
        onChange(
          e.key === "Home"
            ? min
            : e.key === "End"
              ? max
              : Math.max(
                  min,
                  Math.min(max, value + (e.key === "ArrowRight" ? 1 : -1) * (files ? 20 : 0.05))
                )
        );
      }}
    />
  );
}
