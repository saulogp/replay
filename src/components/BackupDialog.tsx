import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Check, ClipboardPaste, Copy, Download, FileUp, X } from 'lucide-react'
import type { LibraryApi } from '../lib/storage'
import { normalize } from '../lib/storage'

interface Props {
  api: LibraryApi
  onClose: () => void
}

export function BackupDialog({ api, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [pasting, setPasting] = useState(false)
  const [text, setText] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const json = JSON.stringify(api.lib, null, 2)
  const native = Capacitor.isNativePlatform()
  const total = api.lib.songs.reduce((n, s) => n + s.segments.length, 0)

  const download = () => {
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `replay-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setMessage({ ok: false, text: 'Não foi possível copiar.' })
    }
  }

  const doImport = (raw: string) => {
    try {
      const data = normalize(JSON.parse(raw))
      if (data.songs.length === 0) throw new Error('vazio')
      api.importLibrary(data)
      setMessage({ ok: true, text: `${data.songs.length} música(s) importada(s).` })
      setPasting(false)
      setText('')
    } catch {
      setMessage({ ok: false, text: 'Esse conteúdo não é um backup válido do Replay.' })
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
          celular.
        </p>

        <h3 className="sub">Exportar</h3>
        <div className="btn-row">
          {!native && (
            <button className="btn btn-soft" onClick={download}>
              <Download size={18} /> Baixar arquivo
            </button>
          )}
          <button className="btn btn-soft" onClick={copy}>
            {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? 'Copiado!' : 'Copiar texto'}
          </button>
        </div>

        <h3 className="sub">Importar</h3>
        <p className="hint">Músicas que você já tem recebem só os trechos novos.</p>
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
              placeholder="Cole aqui o texto do backup"
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
