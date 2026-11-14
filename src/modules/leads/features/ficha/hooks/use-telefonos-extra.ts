'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import { MENSAJE_DE_LEAD_NO_DISPONIBLE, type TelefonoExtra } from '../../../entities/ficha'
import {
  esChoqueDeExtra,
  topeDeExtras,
  type CambioDeExtras,
  type ExtrasGuardados,
  type LeadDeTelefonos,
  type QuitadoDeExtra,
} from '../../../entities/telefonos'
import { guardarTelefonoExtra } from '../actions/guardar-telefono-extra'
import { quitarTelefonoExtra } from '../actions/quitar-telefono-extra'
import { MENSAJE_DE_VALIDACION } from '../resultado'

// Lo que identifica el estado que llega de afuera: si cambia (otra versión de la ficha, el principal que se cambió, otra persona, el
// máximo de la empresa), la lista local se vuelve a sembrar con lo que llegó.
function firmaDe(lead: LeadDeTelefonos): string {
  const extras = lead.telefonos.map((e) => `${e.id}:${e.telefono}:${e.etiqueta ?? ''}`).join(',')
  return `${lead.telefono}|${String(lead.telefonosMaximo)}|${extras}`
}

// La lista local, sembrada con lo que llega de afuera y vuelta a sembrar cuando eso cambia.
function useExtrasSembrados(lead: LeadDeTelefonos) {
  const firma = firmaDe(lead)
  const [visto, setVisto] = useState(firma)
  const [extras, setExtras] = useState<TelefonoExtra[]>(lead.telefonos)
  if (visto !== firma) {
    setVisto(firma)
    setExtras(lead.telefonos)
  }
  return [extras, setExtras] as const
}

type Entrada = { id: string; telefono: string; etiqueta: string | null; creadoEn?: string | null }

export const MENSAJE_DE_RESTITUCION_CHOCADA =
  'Ese número ya lo tiene otro lead: no se pudo restituir.'

// Los teléfonos extra de un lead (la ficha, su panel de edición o el resumen del listado). Una petición por acción, y la respuesta trae la
// lista completa (como mucho 20 filas): no se vuelve a leer el lead ni se mueve su versión. Un extra no tiene versión: operar sobre una
// fila es idempotente por su id y un reintento no duplica. `alCambiar` avisa a quien muestra el lead de afuera (la ficha vuelve a leer, el
// resumen relee) cuando la lista cambió.
export function useTelefonosExtra(lead: LeadDeTelefonos, alCambiar?: () => void) {
  const router = useRouter()
  const [extras, setExtras] = useExtrasSembrados(lead)
  const guardar = useAction(guardarTelefonoExtra)
  const quitar = useAction(quitarTelefonoExtra)

  // Lo que sigue a cualquier respuesta: la lista nueva, o el lead que ya no se ve. Un choque con otro lead no cambia nada.
  function aplicar<T extends CambioDeExtras>(envio: Envio<T>) {
    if (envio.ok) {
      if (!esChoqueDeExtra(envio.data)) {
        setExtras(envio.data.telefonos)
        alCambiar?.()
      }
    } else if (!('sinRed' in envio) && envio.error.mensaje === MENSAJE_DE_LEAD_NO_DISPONIBLE) {
      router.refresh()
    }
    return envio
  }

  async function guardarEntrada(entrada: Entrada, codigoDePais: string | null) {
    return aplicar(
      await enviarAccion<CambioDeExtras>(
        guardar.executeAsync({
          leadId: lead.id,
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
  // número (o ahora es el principal, o ya se llegó al máximo), la base lo rechaza y se dice sin más.
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
    if (!envio.ok) {
      avisarError(envio.error)
    } else if (esChoqueDeExtra(envio.data)) {
      avisarError({ codigo: 'conflicto', mensaje: MENSAJE_DE_RESTITUCION_CHOCADA })
    } else {
      avisarExito('Teléfono restituido.')
    }
  }

  async function quitarExtra(extra: TelefonoExtra) {
    const envio = aplicar<ExtrasGuardados>(
      await enviarAccion<ExtrasGuardados>(
        quitar.executeAsync({ leadId: lead.id, id: extra.id }),
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

  const tope = topeDeExtras(extras.length, lead.telefonosMaximo)
  return {
    extras,
    enCurso: guardar.isPending || quitar.isPending,
    // Con el máximo de la empresa no entra otro: lo dice la interfaz antes de que lo diga la base.
    topeAlcanzado: tope.alcanzado,
    // Cuántos hay de más si el máximo se bajó después (los suyos quedan), y lo que se le dice a quien no puede agregar.
    sobran: tope.sobran,
    motivoDelTope: tope.motivo,
    // El código de país del lead (el de la empresa si guardó uno) es el que completa lo que se escribe.
    guardar: (entrada: Entrada) => guardarEntrada(entrada, lead.telefonoCc),
    quitar: quitarExtra,
  }
}

export type TelefonosExtra = ReturnType<typeof useTelefonosExtra>
