'use client'

import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { Confirmar } from '@/shared/ui/confirmar'
import type { Testimonio } from '../../../../entities/contenido/testimonios'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // Al que se le retira el consentimiento (el último que se vio, mientras el diálogo se va).
  testimonio: Testimonio | null
  // Devuelve el motivo si la base no lo dejó (el diálogo sigue abierto y lo dice).
  alRetirar: (testimonio: Testimonio) => Promise<ErrorApp | null>
  focoAlCerrar: () => HTMLElement | boolean
}

const recortado = (texto: string) => (texto.length > 60 ? `${texto.slice(0, 59)}…` : texto)

// «Retirar el consentimiento» de un testimonio (`?panel=retirar-consentimiento&testimonio=<id>`): despublica, así que pide confirmar nombrando al cliente. Un rechazo de la base se dice dentro del
// diálogo, sin cerrarlo. Se abre desde el «⋯» de la lista, nunca desde el panel de edición (así `?panel=` tiene un solo dueño).
export function ConfirmarRetirarConsentimiento({
  abierto,
  alCerrar,
  testimonio,
  alRetirar,
  focoAlCerrar,
}: Props) {
  const [error, setError] = useState<ErrorApp | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  function cerrar() {
    setError(null)
    alCerrar()
  }

  async function alConfirmar() {
    if (!testimonio) {
      return
    }
    setError(null)
    setEnCurso(true)
    const rechazo = await alRetirar(testimonio)
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
      titulo={
        testimonio
          ? `Retirar el consentimiento de «${recortado(testimonio.cliente)}»`
          : 'Retirar el consentimiento'
      }
      descripcion="Deja de verse en la web pública y queda sin publicar. Puedes registrarlo de nuevo."
      etiquetaConfirmar="Retirar consentimiento"
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
