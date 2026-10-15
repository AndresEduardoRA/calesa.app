'use client'

import { CheckIcon, CopyIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { avisar } from '@/shared/ui/toasts'

// Copia un texto al portapapeles y lo dice en el botón. Si el navegador no deja, pide copiarlo a mano
// (el texto está a la vista y se puede seleccionar).
export function BotonCopiar({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
    } catch {
      avisar('No pudimos copiar: selecciónalo y cópialo a mano.')
    }
  }
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 md:h-8"
      onClick={() => void copiar()}
      onBlur={() => {
        setCopiado(false)
      }}
    >
      {copiado ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
      <span aria-live="polite">{copiado ? 'Copiado' : etiqueta}</span>
    </Button>
  )
}
