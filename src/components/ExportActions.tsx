import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Check, Copy, Download } from 'lucide-react'

interface Props {
  /** conteúdo a exportar (já serializado) */
  json: string
  /** nome do arquivo baixado, sem extensão */
  filename: string
}

/** Botões "Baixar arquivo" (só no navegador) e "Copiar texto" para um JSON exportado. */
export function ExportActions({ json, filename }: Props) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)
  const native = Capacitor.isNativePlatform()

  const download = () => {
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${filename}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json)
      setError(false)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError(true)
    }
  }

  return (
    <>
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
      {error && <p className="form-error">Não foi possível copiar.</p>}
    </>
  )
}
