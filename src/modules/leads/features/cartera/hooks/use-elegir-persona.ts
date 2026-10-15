'use client'

import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisar, avisarExito } from '@/shared/ui/toasts'
import { filtrarCandidatos, type CandidatoDeCartera } from '../../../entities/cartera'
import type { CarteraDelLead } from './use-cartera'

export type ModoDePanelDeCartera = 'compartir' | 'transferir'

// Lo que se dice al terminar, según el movimiento y si cambió algo.
function textoAlTerminar(
  modo: ModoDePanelDeCartera,
  sinCambios: boolean,
  lead: string,
  persona: string,
): string {
  if (modo === 'compartir') {
    return sinCambios ? `${persona} ya lo tenía.` : `Compartiste «${lead}» con ${persona}.`
  }
  return sinCambios ? `«${lead}» ya era de ${persona}.` : `«${lead}» ahora es de ${persona}.`
}

// Elegir a quién se le da el lead dentro del panel: la búsqueda, quién está elegido, el pedido y su
// error (con el campo que lo causó, si la base lo dijo). Terminar cierra el panel.
type Entrada = {
  modo: ModoDePanelDeCartera
  leadNombre: string
  candidatos: readonly CandidatoDeCartera[]
  cartera: CarteraDelLead
  alTerminar: () => void
}

export function useElegirPersona({ modo, leadNombre, candidatos, cartera, alTerminar }: Entrada) {
  const [texto, setTexto] = useState('')
  const [elegidoId, setElegidoId] = useState<string | null>(null)
  const [error, setError] = useState<ErrorApp | null>(null)
  const persona = candidatos.find((c) => c.id === elegidoId) ?? null

  async function confirmar() {
    if (!persona) {
      return
    }
    setError(null)
    const envio =
      modo === 'compartir'
        ? await cartera.compartir(persona.id)
        : await cartera.transferir(persona.id)
    if (!envio.ok) {
      setError(envio.error)
      return
    }
    const sinCambios = envio.data.resultado === 'sin_cambios'
    const texto = textoAlTerminar(modo, sinCambios, leadNombre, persona.nombre)
    if (sinCambios) {
      avisar(texto)
    } else {
      avisarExito(texto)
    }
    alTerminar()
  }

  return {
    texto,
    buscar: setTexto,
    visibles: filtrarCandidatos(candidatos, texto),
    elegidoId,
    elegir: (id: string) => {
      setElegidoId(id)
      setError(null)
    },
    persona,
    error,
    confirmar,
  }
}
