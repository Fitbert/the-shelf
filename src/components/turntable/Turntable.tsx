"use client";

import { useRef } from "react";

const REST_ANGLE = -30;
const DROP_ANGLE = 4;

export type TurntableProps = {
  title: string | null;
  photoUrl: string | null;
  loaded: boolean;
  spinning: boolean;
  dropped: boolean;
  rpm45: boolean;
  onDrop: () => void;
  onLift: () => void;
};

export default function Turntable({
  title,
  photoUrl,
  loaded,
  spinning,
  dropped,
  rpm45,
  onDrop,
  onLift,
}: TurntableProps) {
  const tonearmRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  function pointerAngle(e: PointerEvent | React.PointerEvent) {
    const el = tonearmRef.current;
    if (!el) return REST_ANGLE;
    const rect = el.getBoundingClientRect();
    const pivotX = rect.left + rect.width / 2;
    const pivotY = rect.top;
    const dx = e.clientX - pivotX;
    const dy = e.clientY - pivotY;
    return Math.atan2(dx, dy) * (180 / Math.PI);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!loaded) return;
    draggingRef.current = true;
    const el = tonearmRef.current;
    el?.classList.add("dragging");
    el?.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const deg = Math.max(REST_ANGLE - 6, Math.min(DROP_ANGLE + 12, pointerAngle(e)));
    const el = tonearmRef.current;
    if (el) el.style.transform = `rotate(${deg}deg)`;
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const el = tonearmRef.current;
    el?.classList.remove("dragging");
    if (el) el.style.transform = "";
    const deg = pointerAngle(e);
    const midpoint = (REST_ANGLE + DROP_ANGLE) / 2;
    if (deg > midpoint) onDrop();
    else onLift();
  }

  const armAngle = dropped ? DROP_ANGLE : REST_ANGLE;

  return (
    <div className="deck-stage">
      <div className={`deck${dropped ? " dropped" : ""}`}>
        <div className="plinth">
          <div className="brand-plate">
            the shelf <span>hi-fi</span>
          </div>
          <div className={`power-led${spinning ? " on" : ""}`} />
        </div>

        <div className={`platter${spinning ? " spinning" : ""}${rpm45 ? " rpm45" : ""}`}>
          <div className="strobe-ring" />
          <div
            className="record-label"
            style={
              photoUrl
                ? { backgroundImage: `url(${photoUrl})` }
                : { background: "var(--rust)" }
            }
          >
            {!photoUrl && <span>{(title || "THE SHELF").toUpperCase()}</span>}
          </div>
          <div className="spindle" />
        </div>
        <div className="sheen" />
        <div className="pivot-base" />

        <div
          ref={tonearmRef}
          className="tonearm"
          style={{ transform: `rotate(${armAngle}deg)` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="counterweight" />
          <div className="arm-tube" />
          <div className="headshell">
            <div className="stylus" />
          </div>
        </div>
      </div>
    </div>
  );
}
