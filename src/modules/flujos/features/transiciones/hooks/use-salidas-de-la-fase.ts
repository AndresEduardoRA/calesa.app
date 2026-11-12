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
  type DatosDeSalida,
} from '../../../entities/transiciones/formulario-de-salida'
import type { VersionDeTransicion } from '../../../entities/transiciones/respuestas'
import { useVersionDelFlujo } from '../../configuracion/hooks/use-version-del-flujo'
import { pedidosDeTransiciones } from './pedidos-de-transiciones'
import { useEscrituraDeTransiciones } from './use-escritura-de-transiciones'

// Las salidas de una fase y lo que se les hace: agregar y quitar. Una escritura a la vez; cada una manda la versión del flujo que se tiene en pantalla. La
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
    quitar,
    rechazar: escritura.rechazar,
    releer: escritura.releer,
  }
}

export type SalidasDeLaFase = ReturnType<typeof useSalidasDeLaFase>
