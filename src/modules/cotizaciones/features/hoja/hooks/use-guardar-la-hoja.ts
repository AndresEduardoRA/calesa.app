'use client'

import type { RefObject } from 'react'
import { useAtajo } from '@/shared/ui/atajos'
import { ofreceVerTotalBs } from '../../../entities/cabecera-de-la-hoja'
import { totalDelResumen, type ContextoDeHoja } from '../../../entities/binding'
import { entradasDelPedido, type Entradas } from '../../../entities/entradas'
import type { HojaLista } from '../../../entities/hoja'
import type { RespuestaDeRecalculo } from '../../../entities/recalculo'
import { motivoParaNoGuardar } from '../../../entities/se-puede-guardar'
import { confirmarCeldaAbierta } from './confirmar-celda-abierta'
import type { BotonDeGuardar } from '../components/resumen-de-hoja'
import type { Armar, Guardado } from './use-guardado'
import type { useHoja } from './use-hoja'

// Un override que la persona mandó y el recálculo descartó: la base lo rechaza al guardar (P9).
const descartoLoTipeado = (respuesta: RespuestaDeRecalculo | null, entradas: Entradas) =>
  respuesta?.descartados.some((d) => entradas.overrides.has(d.id)) ?? false

// Lo que la hoja pone para guardar: el motivo para no hacerlo (con un pendiente no hay: se reenvía tal cual, 4-21), cómo arma el pedido con el total al día (P8: las
// entradas que ese recálculo calculó, la misma hoja abierta, y las guardas otra vez con su respuesta) y qué hace «Guardar»: confirmar la celda abierta y pedir.
export function useGuardarLaHoja({
  h,
  contexto,
  hoja,
  leadId,
  vehiculoId,
  guardado,
  raiz,
}: {
  h: ReturnType<typeof useHoja>
  contexto: ContextoDeHoja
  hoja: HojaLista
  leadId: string | null
  vehiculoId: string | null
  guardado: Guardado
  raiz: RefObject<HTMLDivElement | null>
}) {
  const faltaVehiculo = hoja.vehiculoObligatorio && vehiculoId === null
  // Un pendiente se reenvía tal cual: las guardas de la hoja no le aplican (4-21).
  const motivo = guardado.hayPendiente
    ? null
    : motivoParaNoGuardar({
        estado: h.estado,
        leadId,
        faltaVehiculo,
        total: totalDelResumen(contexto),
        descartoLoTipeado: descartoLoTipeado(h.respuesta, h.entradas),
      })
  const armar: Armar = (listo) => {
    h.alQuedarAlDia((r) => {
      if (!r.ok || leadId === null) {
        listo(null)
        return
      }
      const motivoAlDia = motivoParaNoGuardar({
        estado: { tipo: 'al_dia' },
        leadId,
        faltaVehiculo,
        total: totalDelResumen({ indice: h.indice, entradas: r.entradas, respuesta: r.respuesta }),
        descartoLoTipeado: descartoLoTipeado(r.respuesta, r.entradas),
      })
      listo(
        motivoAlDia === null
          ? {
              origenId: hoja.origen.id,
              leadId,
              vehiculoId,
              abierta: h.abierta,
              entradas: entradasDelPedido(r.entradas),
              modoTc: r.entradas.modoTc,
              verTotalBs: ofreceVerTotalBs(hoja.cabecera) && h.verTotalBs,
            }
          : null,
      )
    })
  }
  const alGuardar = () => {
    if (guardado.ocupado) {
      return
    }
    const celda = confirmarCeldaAbierta(raiz.current)
    // Lo que se acaba de confirmar puede arreglar el motivo: lo decide el total al día.
    if (celda === 'invalida' || (celda === 'ninguna' && motivo !== null)) {
      return
    }
    guardado.guardar(armar)
  }
  useAtajo('guardar', alGuardar)
  const total = totalDelResumen(contexto)
  const boton: BotonDeGuardar = {
    motivo,
    motivoYaDicho: total.tipo === 'faltante' || faltaVehiculo,
    ocupado: guardado.ocupado,
    alGuardar,
  }
  return { boton }
}
