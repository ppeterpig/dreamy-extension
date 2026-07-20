import { createRoot } from 'react-dom/client';
import React, { useState } from 'react';
import type { ReadingTrace as ReadingTraceType } from '../../shared/types';
import { READING_TRACE_SIZE, READING_TRACE_HOVER_SIZE, FONT } from '../../shared/constants';

const traces: HTMLElement[] = [];

export function createReadingTrace(trace: ReadingTraceType): void {
  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed;
    top: ${trace.position.top}px;
    left: ${trace.position.left}px;
    width: ${READING_TRACE_SIZE}px;
    height: ${READING_TRACE_SIZE}px;
    z-index: 2147483646;
  `;
  document.body.appendChild(el);

  const root = createRoot(el);
  root.render(React.createElement(TraceThumb, { trace }));

  traces.push(el);

  // Clean up old traces (keep max 20)
  if (traces.length > 20) {
    const oldest = traces.shift();
    if (oldest) oldest.remove();
  }
}

function TraceThumb({ trace }: { trace: ReadingTraceType }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative">
      <img
        src={trace.imageDataUrl}
        alt="Dreamy trace"
        className="dreamy-reading-trace"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={trace.sourceText}
        onClick={() => {
          // Could re-open DreamyBox here
        }}
      />
      {hovered && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
          style={{ width: READING_TRACE_HOVER_SIZE }}
        >
          <img
            src={trace.imageDataUrl}
            alt="Dreamy preview"
            className="dreamy-reading-trace-tooltip"
          />
          <p
            className="text-[10px] text-[#9E9E9E] mt-1 text-center line-clamp-2"
            style={{ fontFamily: FONT }}
          >
            {trace.sourceText}
          </p>
        </div>
      )}
    </div>
  );
}
