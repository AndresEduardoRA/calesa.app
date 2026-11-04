'use client'

import { useMemo } from 'react'
import type { RecalculoInicial } from '../../../entities/apertura'
import { ofreceVerTotalBs } from '../../../entities/cabecera-de-la-hoja'
import { entradasDeLoGuardado } from '../../../entities/entradas-de-lo-guardado'
import {
  difiereAlAbrir,
  hojaSinAbierta,
  muestraElTotalGuardado,
  type HojaDeUnaGuardada,
} from '../../../entities/hoja-de-una-guardada'
import type { AperturaDeHoja } from '../hooks/use-hoja'
import { HojaDeCotizar } from './hoja-de-cotizar'
import { TotalGuardado } from './total-guardado'

type Props = {
  hoja: HojaDeUnaGuardada
  // El primer cálculo, por la cotización y con lo guardado como entradas: lo hizo el servidor con la lectura (C3).
  inicial: RecalculoInicial
}

// El marco de la hoja de una cotización guardada (`/cotizaciones/[id]`, 4.15-3). La hoja calcula por SU cotización (nunca por un origen) y abre con lo guardado como lo tipeado,
// así abrirla sin tocar nada no deja borrador. Quien no la puede guardar la lee en sólo lectura (P13). **Lo de hoy no siempre es lo guardado:** el recálculo usa las tablas de
// referencia y los datos del vehículo de hoy; si da otra cosa se dice y se muestra el total con que se guardó (C11, P2). Se decide una vez, al abrir: tipear después no lo cambia.
// Su `key` es el id de la cotización y la de la hoja, su versión (`actualizadoEn`).
export function PantallaDeUnaGuardada({ hoja, inicial }: Props) {
  const diseno = useMemo(() => hojaSinAbierta(hoja.diseno), [hoja.diseno])
  const abre = useMemo<AperturaDeHoja>(
    () => ({
      de: { tipo: 'guardada', cotizacionId: hoja.cotizacion.id },
      iniciales: (indice) => entradasDeLoGuardado(indice, hoja.guardado, hoja.cotizacion),
      verTotalBsInicial: ofreceVerTotalBs(hoja.diseno.cabecera) && hoja.cotizacion.verTotalBs,
    }),
    [hoja],
  )
  const hayAviso = useMemo(
    () => difiereAlAbrir(hoja.guardado, inicial.respuesta),
    [hoja.guardado, inicial.respuesta],
  )
  const muestraElTotal = muestraElTotalGuardado(hoja.guardado, inicial.respuesta)
  return (
    <HojaDeCotizar
      key={hoja.cotizacion.actualizadoEn}
      hoja={diseno}
      inicial={inicial}
      vehiculoId={hoja.cotizacion.vehiculoId}
      vehiculoSoltado={false}
      leadId={hoja.cotizacion.leadId}
      guardado={null}
      abre={abre}
      soloLectura={!hoja.puedeGuardar}
      totalGuardado={
        <TotalGuardado
          totalUsd={hoja.guardado.totalUsd}
          hayAviso={hayAviso}
          muestraElTotal={muestraElTotal}
        />
      }
    />
  )
}
