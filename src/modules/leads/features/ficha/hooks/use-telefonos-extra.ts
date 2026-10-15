'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import {
  MENSAJE_DE_LEAD_NO_DISPONIBLE,
  type LeadDeFicha,
  type TelefonoExtra,
} from '../../../entities/ficha'
import {
  MAXIMO_DE_TELEFONOS_EXTRA,
  type CambioDeExtras,
  type QuitadoDeExtra,
} from '../../../entities/telefonos'
import { guardarTelefonoExtra } from '../actions/guardar-telefono-extra'
import { quitarTelefonoExtra } from '../actions/quitar-telefono-extra'
import { MENSAJE_DE_VALIDACION } from '../resultado'

// Lo que identifica el estado que trae la página: si cambia (otra versión de la ficha, el principal
// que se cambió, otra persona), la lista local se vuelve a sembrar con lo que llegó.
function firmaDe(ficha: LeadDeFicha): string {
  const extras = ficha.telefonos.map((e) => `${e.id}:${e.telefono}:${e.etiqueta ?? ''}`).join(',')
  return `${ficha.telefono}|${extras}`
}

type Entrada = { id: string; telefono: string; etiqueta: string | null; creadoEn?: string | null }

// Los teléfonos extra de la ficha. Una petición por acción, y la respuesta trae la lista completa
// (como mucho 10 filas): no se vuelve a leer la ficha ni se mueve su versión. Un extra no tiene
// versión: operar sobre una fila es idempotente por su id y un reintento no duplica.
export function useTelefonosExtra(ficha: LeadDeFicha) {
  const router = useRouter()
  const firma = firmaDe(ficha)
  const [visto, setVisto] = useState(firma)
  const [extras, setExtras] = useState<TelefonoExtra[]>(ficha.telefonos)
  if (visto !== firma) {
    setVisto(firma)
    setExtras(ficha.telefonos)
  }
  const guardar = useAction(guardarTelefonoExtra)
  const quitar = useAction(quitarTelefonoExtra)

  // Lo que sigue a cualquier respuesta: la lista nueva, o el lead que ya no se ve.
  function aplicar(envio: Envio<CambioDeExtras>) {
    if (envio.ok) {
      setExtras(envio.data.telefonos)
    } else if (!('sinRed' in envio) && envio.error.mensaje === MENSAJE_DE_LEAD_NO_DISPONIBLE) {
      router.refresh()
    }
    return envio
  }

  async function guardarEntrada(entrada: Entrada, codigoDePais: string | null) {
    return aplicar(
      await enviarAccion<CambioDeExtras>(
        guardar.executeAsync({
          leadId: ficha.id,
          id: entrada.id,
          codigoDePais,
          telefono: entrada.telefono,
          etiqueta: entrada.etiqueta,
          creadoEn: entrada.creadoEn ?? null,
        }),
        MENSAJE_DE_VALIDACION,
      ),
    )
  }

  // Vuelve a poner lo que se quitó: mismo id, etiqueta y lugar. Si entretanto alguien agregó ese
  // número (o ahora es el principal, o ya hay 10), la base lo rechaza y se dice sin más.
  async function restituir(quitado: QuitadoDeExtra) {
    const envio = await guardarEntrada(
      {
        id: quitado.id,
        telefono: `+${quitado.telefono}`,
        etiqueta: quitado.etiqueta,
        creadoEn: quitado.creadoEn,
      },
      null,
    )
    if (envio.ok) {
      avisarExito('Teléfono restituido.')
    } else {
      avisarError(envio.error)
    }
  }

  async function quitarExtra(extra: TelefonoExtra) {
    const envio = aplicar(
      await enviarAccion<CambioDeExtras>(
        quitar.executeAsync({ leadId: ficha.id, id: extra.id }),
        MENSAJE_DE_VALIDACION,
      ),
    )
    if (!envio.ok) {
      avisarError(envio.error)
      return
    }
    const { quitado } = envio.data
    if (quitado) {
      avisarConDeshacer('Teléfono quitado.', () => void restituir(quitado))
    }
  }

  return {
    extras,
    enCurso: guardar.isPending || quitar.isPending,
    // Con 10 no entra otro: lo dice la interfaz antes de que lo diga la base.
    topeAlcanzado: extras.length >= MAXIMO_DE_TELEFONOS_EXTRA,
    // El código de país del lead (el de la empresa si guardó uno) es el que completa lo que se escribe.
    guardar: (entrada: Entrada) => guardarEntrada(entrada, ficha.telefonoCc),
    quitar: quitarExtra,
  }
}

export type TelefonosExtra = ReturnType<typeof useTelefonosExtra>
