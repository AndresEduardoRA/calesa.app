'use client'

import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { Confirmar } from '@/shared/ui/confirmar'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { autorDelAdjunto, type Adjunto } from '../../../entities/comentarios/adjunto'

type Props = {
  // Lo que se va a quitar; null = cerrado. Estable entre renders (sale de la lista).
  objetivo: Adjunto | null
  quitar: (adjunto: Adjunto) => Promise<ErrorApp | null>
  alCerrar: () => void
}

// La confirmación de quitar un adjunto (4.27-3), con su URL (`?panel=quitar-adjunto&adjunto=<id>`). Si es ajeno dice quién lo subió. Si la base lo rechaza, lo
// dice adentro y no se cierra.
export function ConfirmarQuitadoDeAdjunto({ objetivo, quitar, alCerrar }: Props) {
  const [error, setError] = useState<ErrorApp | null>(null)
  const [enCurso, setEnCurso] = useState(false)
  const mostrado = useUltimo(objetivo)
  const ajeno = mostrado && !mostrado.mio ? ` Lo subió ${autorDelAdjunto(mostrado)}.` : ''

  function cerrar() {
    setError(null)
    alCerrar()
  }

  async function confirmar() {
    if (!objetivo) {
      return
    }
    setError(null)
    setEnCurso(true)
    const rechazo = await quitar(objetivo)
    setEnCurso(false)
    if (rechazo === null) {
      cerrar()
    } else {
      setError(rechazo)
    }
  }

  return (
    <Confirmar
      abierto={objetivo !== null}
      alCerrar={cerrar}
      alConfirmar={confirmar}
      titulo={mostrado ? `Quitar ${mostrado.nombre}` : ''}
      descripcion={`El archivo deja de estar en esta cotización.${ajeno}`}
      etiquetaConfirmar="Quitar"
      enCurso={enCurso}
    >
      {error ? (
        <Aviso tono="peligro">
          <p>{error.mensaje}</p>
        </Aviso>
      ) : null}
    </Confirmar>
  )
}
