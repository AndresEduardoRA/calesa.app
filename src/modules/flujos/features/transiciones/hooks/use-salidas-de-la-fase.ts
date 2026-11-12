'use client'

import { useMemo } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import type {
  FaseParaConfigurar,
  FlujoParaConfigurar,
  TransicionParaConfigurar,
} from '../../../entities/flujo'
import {
  destinosDisponibles,
  motivoSinDestinos,
  salidasDe,
  type CambiosDeSalida,
  type DatosDeSalida,
} from '../../../entities/transiciones/formulario-de-salida'
import type { VersionDeTransicion } from '../../../entities/transiciones/respuestas'
import { useVersionDelFlujo } from '../../configuracion/hooks/use-version-del-flujo'
import { pedidosDeTransiciones } from './pedidos-de-transiciones'
import { useEscrituraDeTransiciones } from './use-escritura-de-transiciones'

// El resultado de editar una salida: si falló, el envío que falló y si la acción o la nota ya habían quedado guardadas (el pedido de los roles es el segundo).
export type ResultadoDeEdicion =
  | { ok: true }
  | { ok: false; envio: Extract<Envio<VersionDeTransicion>, { ok: false }>; guardado: boolean }

// Las salidas de una fase y lo que se les hace: agregar, editar, quitar y poner quién mueve. Una escritura a la vez; cada una manda la versión del flujo que se tiene en pantalla. La
// lista no viene en la respuesta: la action revalida y la página trae el flujo releído.
export function useSalidasDeLaFase(flujo: FlujoParaConfigurar, fase: FaseParaConfigurar) {
  const { version } = useVersionDelFlujo()
  const escritura = useEscrituraDeTransiciones()
  const salidas = useMemo(() => salidasDe(flujo, fase.id), [flujo, fase.id])
  const destinos = useMemo(() => destinosDisponibles(flujo, fase.id), [flujo, fase.id])
  const pedir = pedidosDeTransiciones(flujo.ambito, flujo.id, version)

  // Los del formulario: devuelven el envío entero, para que diga el motivo junto a su campo.
  function agregar(id: string, datos: DatosDeSalida): Promise<Envio<VersionDeTransicion> | null> {
    return escritura.mandar(() => pedir.crear(id, fase.id, datos))
  }

  // Edita una salida: primero lo que cambió de la acción y la nota, y después sus roles, bajo una sola marca de envío. El segundo pedido lleva la versión que
  // devolvió el primero (no la de la pantalla, que es la de antes de escribir). Si el primero falla, el segundo no sale. Nulo: ya había un envío en vuelo.
  function editar(
    salida: TransicionParaConfigurar,
    cambios: CambiosDeSalida | null,
    roles: readonly string[] | null,
  ): Promise<ResultadoDeEdicion | null> {
    return escritura.mandar(async (): Promise<ResultadoDeEdicion> => {
      let versionActual = version
      if (cambios !== null) {
        const primero = await pedir.guardar(salida.id, cambios)
        if (!primero.ok) {
          return { ok: false, envio: primero, guardado: false }
        }
        versionActual = primero.data.actualizadoEn
      }
      if (roles !== null) {
        const segundo = await pedidosDeTransiciones(
          flujo.ambito,
          flujo.id,
          versionActual,
        ).rolesDeSalida(salida.id, roles)
        if (!segundo.ok) {
          return { ok: false, envio: segundo, guardado: cambios !== null }
        }
      }
      return { ok: true }
    })
  }

  // Quién puede mover a esta fase: la lista completa (vacía: cualquiera con el permiso). Devuelve el envío para decir el motivo junto al botón.
  function ponerRolesDeFase(roles: readonly string[]): Promise<Envio<VersionDeTransicion> | null> {
    return escritura.mandar(() => pedir.rolesDeFase(fase.id, roles))
  }

  // Irreversible: lo confirma el diálogo antes. Devuelve si quedó quitada (si no, el aviso ya salió).
  async function quitar(salida: TransicionParaConfigurar): Promise<boolean> {
    const envio = await escritura.mandar(() => pedir.quitar(salida.id))
    if (envio === null) {
      return false
    }
    if (!envio.ok) {
      escritura.rechazar(envio)
      return false
    }
    avisarExito('Salida quitada.')
    return true
  }

  return {
    salidas,
    destinos,
    motivoSinDestinos: motivoSinDestinos(flujo, fase.id),
    enCurso: escritura.enCurso,
    agregar,
    editar,
    ponerRolesDeFase,
    quitar,
    rechazar: escritura.rechazar,
    releer: escritura.releer,
  }
}

export type SalidasDeLaFase = ReturnType<typeof useSalidasDeLaFase>
