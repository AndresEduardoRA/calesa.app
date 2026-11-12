'use client'

import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { Confirmar } from '@/shared/ui/confirmar'
import type { Faq } from '../../../../entities/contenido/faqs'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // La que se elimina (la última que se vio, mientras el diálogo se va).
  faq: Faq | null
  // Devuelve el motivo si la base no lo dejó (el diálogo sigue abierto y lo dice).
  alEliminar: (faq: Faq) => Promise<ErrorApp | null>
  focoAlCerrar: () => HTMLElement | boolean
}

const recortada = (texto: string) => (texto.length > 60 ? `${texto.slice(0, 59)}…` : texto)

// «Eliminar» una pregunta frecuente (`?panel=eliminar-faq&faq=<id>`): lo irreversible pide confirmar nombrándola. Un rechazo de la base se dice dentro del
// diálogo, sin cerrarlo. Se abre desde el «⋯» de la lista, nunca desde el panel de edición (así `?panel=` tiene un solo dueño).
export function ConfirmarEliminarFaq({ abierto, alCerrar, faq, alEliminar, focoAlCerrar }: Props) {
  const [error, setError] = useState<ErrorApp | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  function cerrar() {
    setError(null)
    alCerrar()
  }

  async function alConfirmar() {
    if (!faq) {
      return
    }
    setError(null)
    setEnCurso(true)
    const rechazo = await alEliminar(faq)
    setEnCurso(false)
    if (rechazo === null) {
      cerrar()
    } else {
      setError(rechazo)
    }
  }

  return (
    <Confirmar
      abierto={abierto}
      alCerrar={cerrar}
      alConfirmar={alConfirmar}
      titulo={faq ? `Eliminar la pregunta «${recortada(faq.pregunta)}»` : 'Eliminar la pregunta'}
      descripcion="Deja de verse en la web pública. No se puede deshacer."
      etiquetaConfirmar="Eliminar pregunta"
      enCurso={enCurso}
      focoAlCerrar={focoAlCerrar}
    >
      {error ? (
        <Aviso tono="peligro">
          <p>{error.mensaje}</p>
        </Aviso>
      ) : null}
    </Confirmar>
  )
}
