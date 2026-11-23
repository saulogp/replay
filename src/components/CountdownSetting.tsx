import { Hourglass, Volume2, VolumeX } from 'lucide-react'
import type { Settings } from '../lib/types'
import { COUNTDOWN_OPTIONS } from '../lib/types'

interface Props {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  /** mostra o texto explicativo */
  explain?: boolean
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-knob" />
    </button>
  )
}

export function CountdownSetting({ settings, onChange, explain }: Props) {
  const { countdownEnabled: on, countdownSeconds: secs, countdownSound: sound } = settings
  return (
    <div className="setting">
      <div className="setting-head">
        <span className="setting-label">
          <Hourglass size={14} /> Contagem antes do trecho
        </span>
        <Switch
          checked={on}
          onChange={(v) => onChange({ countdownEnabled: v })}
          label="Ativar contagem antes do trecho"
        />
      </div>
      {explain && (
        <p className="hint setting-hint">
          Conta {secs} segundo{secs > 1 ? 's' : ''} antes de o trecho começar e antes de cada
          repetição. Assim dá tempo de se preparar e um loop não emenda direto no outro.
        </p>
      )}
      {on && (
        <div className="chips compact">
          {COUNTDOWN_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              className={`chip ${secs === n ? 'is-on' : ''}`}
              onClick={() => onChange({ countdownSeconds: n })}
            >
              {n}s
            </button>
          ))}
          <button
            type="button"
            className={`chip chip-icon ${sound ? 'is-on' : ''}`}
            onClick={() => onChange({ countdownSound: !sound })}
            aria-pressed={sound}
            aria-label={sound ? 'Desligar bip da contagem' : 'Ligar bip da contagem'}
            title={sound ? 'Bip ligado' : 'Bip desligado'}
          >
            {sound ? <Volume2 size={15} /> : <VolumeX size={15} />} Bip
          </button>
        </div>
      )}
    </div>
  )
}
