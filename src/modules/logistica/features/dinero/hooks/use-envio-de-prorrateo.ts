'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisarExito } from '@/shared/ui/toasts'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import type { PedidoDeProrrateo } from '../../../entities/dinero/repositorio-de-gastos'
import { prorratearGasto } from '../actions/prorratear-gasto'
import { avisarCambioDeDinero } from './eventos-de-dinero'

type Args = {
  // Se repartió (o ya estaba repartido): quien llama limpia el formulario y renueva el lote.
  alRepartir: () => void
  // La base rechazó sin escribir nada: el lote ya no sirve.
  alRenovarElLote: () => void
  // La base rechazó campos concretos: el motivo junto a cada uno.
  alRechazarCampos: (porCampo: Record<string, string>) => void
}

const MENSAJE_DE_VALIDACION = 'Revisa los datos del gasto.'
const SIN_RED = 'Sin conexión. El reparto sale solo al volver la red.'

// El envío del prorrateo (6.11-4) por su Server Action. El `lote` hace de id del intento: se conserva si no se sabe qué pasó (sin red, o la respuesta se perdió: `inesperado`) y se renueva cuando
// la base rechazó (no escribió nada). Sin conexión queda pendiente y sale solo al volver la red; devuelve el motivo si la base no lo dejó, para que el diálogo lo diga.
export function useEnvioDeProrrateo({ alRepartir, alRenovarElLote, alRechazarCampos }: Args) {
  const [aviso, setAviso] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<PedidoDeProrrateo | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  async function mandar(pedido: PedidoDeProrrateo): Promise<ErrorApp | null> {
    setEnCurso(true)
    const envio = await enviarAccion(prorratearGasto(pedido), MENSAJE_DE_VALIDACION)
    setEnCurso(false)
    if (envio.ok) {
      setPendiente(null)
      setAviso(null)
      avisarExito(
        envio.data.yaExistia
          ? 'Ya estaba repartido.'
          : `Gasto repartido entre ${String(pedido.unidades.length)} unidades.`,
      )
      for (const id of pedido.unidades) {
        avisarCambioDeDinero(id)
      }
      alRepartir()
      return null
    }
    if ('sinRed' in envio) {
      setPendiente(pedido)
      setAviso(SIN_RED)
      return null
    }
    setPendiente(null)
    if (envio.error.codigo !== 'inesperado') {
      alRenovarElLote()
    }
    if ('porCampo' in envio && envio.porCampo && Object.keys(envio.porCampo).length > 0) {
      alRechazarCampos(envio.porCampo)
      setAviso(envio.error.mensaje)
      return null
    }
    return envio.error
  }

  const enLinea = useReintentoAlVolver(pendiente, async (p) => (await mandar(p)) === null)

  return { mandar, aviso, limpiarAviso: () => setAviso(null), enCurso, enLinea }
}
