'use client'

import { useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { motivoDelCuerpo } from '../schemas/comentarios'

type Parametros = {
  // El campo, para devolverle el foco.
  campo: RefObject<HTMLTextAreaElement | null>
  texto: string
  alEnviar: (texto: string) => Promise<ErrorApp | null>
  alCancelar: (() => void) | undefined
  deshabilitado: boolean
}

// Enviar un campo de comentario (4.27-2): lo vacío o de más de 4.000 se dice sin pedir nada; mientras envía queda apagado; lo que rechaza la base queda como
// error, con el foco de vuelta en el campo. `Ctrl/Cmd+Enter` envía y `Esc` cancela.
export function useEnvioDelCampo({
  campo,
  texto,
  alEnviar,
  alCancelar,
  deshabilitado,
}: Parametros) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<ErrorApp | null>(null)
  const apagado = enviando || deshabilitado

  async function enviar() {
    if (apagado) {
      return
    }
    const motivo = motivoDelCuerpo(texto)
    if (motivo !== null) {
      setError({ codigo: 'validacion', mensaje: motivo })
      campo.current?.focus()
      return
    }
    setEnviando(true)
    setError(null)
    const rechazo = await alEnviar(texto.trim())
    setEnviando(false)
    setError(rechazo)
    // El campo se vuelve a encender en el próximo cuadro: recién ahí acepta el foco.
    requestAnimationFrame(() => {
      campo.current?.focus()
    })
  }

  return {
    enviando,
    apagado,
    error,
    limpiarError: () => {
      setError(null)
    },
    alEnviarElFormulario: (evento: FormEvent) => {
      evento.preventDefault()
      void enviar()
    },
    alTeclear: (evento: KeyboardEvent<HTMLTextAreaElement>) => {
      if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
        evento.preventDefault()
        void enviar()
      } else if (evento.key === 'Escape' && alCancelar && !enviando) {
        evento.preventDefault()
        alCancelar()
      }
    },
  }
}
