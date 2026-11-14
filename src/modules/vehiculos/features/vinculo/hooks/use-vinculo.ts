'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import {
  textoDeInteres,
  textoDeVinculo,
  type RespuestaDeInteres,
  type RespuestaDeVinculo,
} from '../../../entities/vehiculos-del-lead'
import { marcarInteres } from '../actions/marcar-interes'
import { MENSAJE_DE_VALIDACION } from '../actions/resultado'
import { quitarInteres } from '../actions/quitar-interes'
import { vincularVehiculo } from '../actions/vincular-vehiculo'

type Vehiculo = { id: string; titulo: string; numero: number; actualizadoEn: string }

// Lo que el aviso de «desvinculado» ofrece hacer después, con la versión nueva del vehículo.
export type LuegoDeDesvincular = { etiqueta: string; alHacer: (actualizadoEn: string) => void }

// «Deshacer» no dice nada si sale; si no sale, dice por qué.
function deshacerCon<Dato>(pedido: () => Promise<Envio<Dato>>) {
  return () => {
    void pedido().then((vuelta) => {
      if (!vuelta.ok) {
        avisarError(vuelta.error)
      }
    })
  }
}

// El aviso de desvinculado: con `luego`, ofrece lo que se quería hacer después; con `volver`, «Deshacer»; si no, sólo lo dice.
function avisarDesvinculado(
  texto: string,
  version: string,
  { luego, volver }: { luego: LuegoDeDesvincular | undefined; volver: (() => void) | null },
) {
  if (luego) {
    avisarExito(texto, {
      etiqueta: luego.etiqueta,
      alHacer: () => luego.alHacer(version),
      duracion: 10_000,
    })
  } else if (volver) {
    avisarConDeshacer(texto, volver)
  } else {
    avisarExito(texto)
  }
}

function exigirLead(leadId: string | null): string {
  if (!leadId) {
    throw new Error('esta acción necesita el lead de la ficha')
  }
  return leadId
}

// Vincular, desvincular, marcar y quitar interés. Cada pedido se dice entero en un aviso; la pantalla
// se vuelve a dibujar por la action (revalida la ficha del lead y la del vehículo). `leadId` es el
// lead de la ficha: nulo en la del vehículo, donde sólo se desvincula.
export function useVinculo(leadId: string | null) {
  const acciones = {
    vincular: useAction(vincularVehiculo),
    marcar: useAction(marcarInteres),
    quitar: useAction(quitarInteres),
  }

  const pedirVinculo = (vehiculoId: string, actualizadoEnEsperado: string, lead: string | null) =>
    enviarAccion<RespuestaDeVinculo>(
      acciones.vincular.executeAsync({ vehiculoId, actualizadoEnEsperado, leadId: lead }),
      MENSAJE_DE_VALIDACION,
    )

  const pedirInteres = (vehiculoId: string, lead: string, nota: string | null) =>
    enviarAccion<RespuestaDeInteres>(
      acciones.marcar.executeAsync({ vehiculoId, leadId: lead, nota }),
      MENSAJE_DE_VALIDACION,
    )

  // `anterior` nombra al lead que lo pierde, si se reemplaza.
  async function vincular(
    vehiculo: Vehiculo,
    anterior?: string,
  ): Promise<Envio<RespuestaDeVinculo>> {
    const envio = await pedirVinculo(vehiculo.id, vehiculo.actualizadoEn, exigirLead(leadId))
    if (envio.ok) {
      avisarExito(textoDeVinculo(envio.data, vehiculo, anterior))
    }
    return envio
  }

  // Con `deshacer`, «Deshacer» lo vuelve a vincular a este lead con la versión que devolvió (sólo se
  // ofrece a quien podría vincularlo: la cartera del lead). Con `luego`, el aviso ofrece lo que se quería hacer después (enviar a la papelera)
  // con la versión que devolvió, también si ya estaba sin vínculo.
  async function desvincular(
    vehiculo: Vehiculo,
    { deshacer, luego }: { deshacer: boolean; luego?: LuegoDeDesvincular },
  ) {
    const envio = await pedirVinculo(vehiculo.id, vehiculo.actualizadoEn, null)
    if (!envio.ok) {
      avisarError(envio.error)
      return envio
    }
    const texto = textoDeVinculo(envio.data, vehiculo)
    const version = envio.data.actualizadoEn
    const volver =
      deshacer && leadId && envio.data.resultado === 'desvinculado'
        ? deshacerCon(() => pedirVinculo(vehiculo.id, version, leadId))
        : null
    avisarDesvinculado(texto, version, { luego, volver })
    return envio
  }

  async function marcar(
    vehiculo: Vehiculo,
    nota: string | null,
  ): Promise<Envio<RespuestaDeInteres>> {
    const envio = await pedirInteres(vehiculo.id, exigirLead(leadId), nota)
    if (envio.ok) {
      avisarExito(textoDeInteres(envio.data, vehiculo))
    }
    return envio
  }

  // Se hace y ofrece «Deshacer», que lo vuelve a marcar con la misma nota.
  async function quitar(vehiculo: Vehiculo) {
    const lead = exigirLead(leadId)
    const envio = await enviarAccion<RespuestaDeInteres>(
      acciones.quitar.executeAsync({ vehiculoId: vehiculo.id, leadId: lead }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      avisarError(envio.error)
    } else if (envio.data.resultado === 'quitado') {
      const nota = envio.data.nota
      avisarConDeshacer(
        textoDeInteres(envio.data, vehiculo),
        deshacerCon(() => pedirInteres(vehiculo.id, lead, nota)),
      )
    }
    return envio
  }

  return {
    enCurso: Object.values(acciones).some((accion) => accion.isPending),
    vincular,
    desvincular,
    marcar,
    quitar,
  }
}

export type AccionesDeVinculo = ReturnType<typeof useVinculo>
