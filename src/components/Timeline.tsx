import { useMemo, useRef } from 'react'
import type { Segment } from '../lib/types'
import { formatTime } from '../lib/time'

interface Props {
  duration: number
  time: number
  segments: Segment[]
  activeId: string | null
  markA: number | null
  onSeek: (t: number) => void
  onPlaySegment: (seg: Segment) => void
}

/** Distribui trechos sobrepostos em faixas para que nenhum esconda o outro. */
function assignLanes(segments: Segment[]) {
  const sorted = [...segments].sort((a, b) => a.start - b.start)
  const laneEnds: number[] = []
  const lanes = new Map<string, number>()
  for (const s of sorted) {
    let lane = laneEnds.findIndex((end) => end <= s.start)
    if (lane < 0) {
      lane = laneEnds.length
      laneEnds.push(s.end)
    } else {
      laneEnds[lane] = s.end
    }
    lanes.set(s.id, lane)
  }
  return { lanes, count: Math.max(1, laneEnds.length) }
}

export function Timeline({
  duration,
  time,
  segments,
  activeId,
  markA,
  onSeek,
  onPlaySegment,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const { lanes, count } = useMemo(() => assignLanes(segments), [segments])
  const pct = (t: number) => (duration > 0 ? Math.min(100, Math.max(0, (t / duration) * 100)) : 0)

  const seekFromEvent = (clientX: number) => {
    const el = trackRef.current
    if (!el || duration <= 0) return
    const r = el.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    onSeek(ratio * duration)
  }

  return (
    <div className="timeline">
      {segments.length > 0 && (
        <div className="timeline-lanes" style={{ height: count * 14 }}>
          {segments.map((s) => (
            <button
              key={s.id}
              className={`timeline-seg ${s.id === activeId ? 'is-active' : ''}`}
              title={`${s.name} (${formatTime(s.start)} – ${formatTime(s.end)})`}
              aria-label={`Tocar ${s.name}`}
              style={{
                left: `${pct(s.start)}%`,
                width: `max(6px, ${pct(s.end) - pct(s.start)}%)`,
                top: (lanes.get(s.id) ?? 0) * 14,
                background: s.color,
              }}
              onClick={() => onPlaySegment(s)}
            />
          ))}
        </div>
      )}
      <div
        ref={trackRef}
        className="timeline-track"
        role="slider"
        aria-label="Posição na música"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(time)}
        tabIndex={0}
        onPointerDown={(e) => {
          dragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          seekFromEvent(e.clientX)
        }}
        onPointerMove={(e) => dragging.current && seekFromEvent(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') onSeek(Math.min(duration, time + 5))
          if (e.key === 'ArrowLeft') onSeek(Math.max(0, time - 5))
        }}
      >
        <div className="timeline-fill" style={{ width: `${pct(time)}%` }} />
        {segments.map((s) => (
          <div
            key={s.id}
            className="timeline-region"
            style={{
              left: `${pct(s.start)}%`,
              width: `${pct(s.end) - pct(s.start)}%`,
              background: s.color,
              opacity: s.id === activeId ? 0.55 : 0.22,
            }}
          />
        ))}
        {markA !== null && <div className="timeline-mark" style={{ left: `${pct(markA)}%` }} />}
        <div className="timeline-head" style={{ left: `${pct(time)}%` }} />
      </div>
      <div className="timeline-times">
        <span>{formatTime(time)}</span>
        <span>{formatTime(duration, 0)}</span>
      </div>
    </div>
  )
}
