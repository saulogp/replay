import { useState } from 'react'
import { ClipboardPaste, FileUp, X } from 'lucide-react'
import type { LibraryApi } from '../lib/storage'
import { normalize } from '../lib/storage'
import { ExportActions } from './ExportActions'

interface Props {
  api: LibraryApi
  onClose: () => void
}

export function BackupDialog({ api, onClose }: Props) {
  const [pasting, setPasting] = useState(false)
  const [text, setText] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const json = JSON.stringify(api.lib, null, 2)
  const total = api.lib.songs.reduce((n, s) => n + s.segments.length, 0)

  const doImport = (raw: string) => {
    try {
      const data = normalize(JSON.parse(raw))
      if (data.songs.length === 0) throw new Error('vazio')
      api.importLibrary(data)
      const text =
        data.songs.length === 1
          ? `"${data.songs[0].title}" importada.`
          : `${data.songs.length} músicas importadas.`
      setMessage({ ok: true, text })
      setPasting(false)
      setText('')
    } catch {
      setMessage({ ok: false, text: 'Esse conteúdo não é um backup nem uma música exportada do Replay.' })
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <header className="sheet-header">
          <h2>Backup</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>
        <p className="hint">
          Suas músicas ficam salvas neste aparelho. Use o backup para levar seus{' '}
          {api.lib.songs.length} música(s) e {total} trecho(s) para outro navegador ou para o
          celular. Para exportar uma música só, abra a música e toque em compartilhar.
        </p>

        <h3 className="sub">Exportar</h3>
        <ExportActions json={json} filename={`replay-backup-${today}`} />

        <h3 className="sub">Importar</h3>
        <p className="hint">
          Aceita um backup completo ou uma música exportada. Músicas que você já tem recebem só os
          trechos novos.
        </p>
        <div className="btn-row">
          <label className="btn btn-soft">
            <FileUp size={18} /> Abrir arquivo
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) doImport(await f.text())
                e.target.value = ''
              }}
            />
          </label>
          <button className="btn btn-soft" onClick={() => setPasting((p) => !p)}>
            <ClipboardPaste size={18} /> Colar texto
          </button>
        </div>
        {pasting && (
          <div className="paste-box">
            <textarea
              className="text-input"
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Cole aqui o texto do backup ou da música"
            />
            <button className="btn btn-primary" disabled={!text.trim()} onClick={() => doImport(text)}>
              Importar
            </button>
          </div>
        )}
        {message && <p className={message.ok ? 'form-ok' : 'form-error'}>{message.text}</p>}
      </div>
    </div>
  )
}
