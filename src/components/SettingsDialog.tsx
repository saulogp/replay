import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { LibraryApi } from '../lib/storage'
import { CountdownSetting } from './CountdownSetting'

interface Props {
  api: LibraryApi
  onClose: () => void
}

export function SettingsDialog({ api, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <header className="sheet-header">
          <h2>Configurações</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>
        <p className="hint">Valem para todas as músicas e trechos.</p>
        <div className="settings-card" style={{ marginTop: 16 }}>
          <CountdownSetting settings={api.lib.settings} onChange={api.updateSettings} explain />
        </div>
      </div>
    </div>
  )
}
