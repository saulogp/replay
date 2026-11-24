import { useEffect, useState } from 'react'
import { Clock, Headphones, Minus, Plus, Trash2, X } from 'lucide-react'
import type { Segment } from '../lib/types'
import { REPEAT_OPTIONS, SEGMENT_COLORS, SPEED_OPTIONS } from '../lib/types'
import { formatDuration, formatTime, parseTime } from '../lib/time'

interface Props {
  initial: Segment
  isNew: boolean
  duration: number
  getCurrentTime: () => number
  onSave: (seg: Segment) => void
  onCancel: () => void
  onPreview: (seg: Segment) => void
  onDelete?: () => void
}

function TimeField({
  label,
  value,
  onChange,
  getCurrentTime,
  max,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  getCurrentTime: () => number
  max: number
}) {
  const [text, setText] = useState(formatTime(value))
  useEffect(() => {
    setText(formatTime(value))
  }, [value])

  const clamp = (v: number) => Math.min(max > 0 ? max : Infinity, Math.max(0, v))
  const commit = () => {
    const v = parseTime(text)
    if (v === null) setText(formatTime(value))
    else onChange(clamp(v))
  }

  return (
    <div className="time-field">
      <span className="field-label">{label}</span>
      <div className="time-field-row">
        <button
          type="button"
          className="icon-btn sm"
          aria-label={`${label}: voltar meio segundo`}
          onClick={() => onChange(clamp(value - 0.5))}
        >
          <Minus size={16} />
        </button>
        <input
          className="time-input"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
          aria-label={label}
        />
        <button
          type="button"
          className="icon-btn sm"
          aria-label={`${label}: avançar meio segundo`}
          onClick={() => onChange(clamp(value + 0.5))}
        >
          <Plus size={16} />
        </button>
      </div>
      <button
        type="button"
        className="link-btn"
        onClick={() => onChange(clamp(getCurrentTime()))}
      >
        <Clock size={14} /> usar tempo atual
      </button>
    </div>
  )
}

export function SegmentEditor({
  initial,
  isNew,
  duration,
  getCurrentTime,
  onSave,
  onCancel,
  onPreview,
  onDelete,
}: Props) {
  const [seg, setSeg] = useState<Segment>(initial)
  const [customRepeats, setCustomRepeats] = useState(!REPEAT_OPTIONS.includes(initial.repeats))
  const set = (patch: Partial<Segment>) => setSeg((s) => ({ ...s, ...patch }))

  const length = seg.end - seg.start
  const invalid = length < 0.3

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (!invalid) onSave({ ...seg, name: seg.name.trim() || 'Trecho' })
        }}
      >
        <div className="sheet-handle" />
        <header className="sheet-header">
          <h2>{isNew ? 'Novo trecho' : 'Editar trecho'}</h2>
          <button type="button" className="icon-btn" onClick={onCancel} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>

        <label className="field">
          <span className="field-label">Nome</span>
          <input
            className="text-input"
            value={seg.name}
            placeholder="Ex.: Refrão, Solo, Ponte…"
            onChange={(e) => set({ name: e.target.value })}
            autoFocus={isNew}
          />
        </label>

        <div className="time-grid">
          <TimeField
            label="Início"
            value={seg.start}
            max={duration}
            getCurrentTime={getCurrentTime}
            onChange={(v) => set({ start: v })}
          />
          <TimeField
            label="Fim"
            value={seg.end}
            max={duration}
            getCurrentTime={getCurrentTime}
            onChange={(v) => set({ end: v })}
          />
        </div>
        <p className={`hint ${invalid ? 'hint-error' : ''}`}>
          {invalid
            ? 'O fim precisa vir depois do início.'
            : `Duração do trecho: ${formatDuration(length)}`}
        </p>

        <div className="field">
          <span className="field-label">Quantas vezes tocar</span>
          <div className="chips">
            {REPEAT_OPTIONS.map((r) => (
              <button
                type="button"
                key={r}
                className={`chip ${!customRepeats && seg.repeats === r ? 'is-on' : ''}`}
                onClick={() => {
                  setCustomRepeats(false)
                  set({ repeats: r })
                }}
              >
                {r === 0 ? '∞ sem parar' : r === 1 ? '1 vez' : `${r}×`}
              </button>
            ))}
            <button
              type="button"
              className={`chip ${customRepeats ? 'is-on' : ''}`}
              onClick={() => setCustomRepeats(true)}
            >
              Outro
            </button>
          </div>
          {customRepeats && (
            <div className="stepper">
              <button
                type="button"
                className="icon-btn sm"
                aria-label="Menos repetições"
                onClick={() => set({ repeats: Math.max(1, (seg.repeats || 1) - 1) })}
              >
                <Minus size={16} />
              </button>
              <span className="stepper-value">{seg.repeats || 1}×</span>
              <button
                type="button"
                className="icon-btn sm"
                aria-label="Mais repetições"
                onClick={() => set({ repeats: Math.min(999, (seg.repeats || 1) + 1) })}
              >
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="field">
          <span className="field-label">Velocidade</span>
          <div className="chips">
            {SPEED_OPTIONS.map((s) => (
              <button
                type="button"
                key={s}
                className={`chip ${seg.speed === s ? 'is-on' : ''}`}
                onClick={() => set({ speed: s })}
              >
                {s === 1 ? 'Normal' : `${s}×`}
              </button>
            ))}
          </div>
          <p className="hint">Dica: comece mais devagar e aumente conforme pegar o trecho.</p>
        </div>

        <div className="field">
          <span className="field-label">Cor</span>
          <div className="colors">
            {SEGMENT_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={`color-dot ${seg.color === c ? 'is-on' : ''}`}
                style={{ background: c }}
                aria-label={`Cor ${c}`}
                onClick={() => set({ color: c })}
              />
            ))}
          </div>
        </div>

        <footer className="sheet-footer">
          {onDelete && (
            <button type="button" className="btn btn-danger-ghost" onClick={onDelete}>
              <Trash2 size={18} /> Excluir
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            disabled={invalid}
            onClick={() => onPreview({ ...seg, repeats: 1 })}
          >
            <Headphones size={18} /> Ouvir
          </button>
          <button type="submit" className="btn btn-primary" disabled={invalid}>
            Salvar trecho
          </button>
        </footer>
      </form>
    </div>
  )
}
