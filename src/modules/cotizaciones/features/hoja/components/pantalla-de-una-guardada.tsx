'use client'

import { useMemo, useState } from 'react'
import { guardarBorradorDeEstado } from '@/shared/lib/borrador'
import type { RecalculoInicial } from '../../../entities/apertura'
import { ofreceVerTotalBs } from '../../../entities/cabecera-de-la-hoja'
import { claveDelBorradorDeUnaGuardada } from '../../../entities/claves-de-la-hoja'
import { entradasDeLoGuardado } from '../../../entities/entradas-de-lo-guardado'
import {
  difiereAlAbrir,
  hojaSinAbierta,
  muestraElTotalGuardado,
  type HojaDeUnaGuardada,
} from '../../../entities/hoja-de-una-guardada'
import { useGuardadoDeUnaGuardada } from '../hooks/use-guardado-de-una-guardada'
import type { AperturaDeHoja } from '../hooks/use-hoja'
import { HojaDeCotizar } from './hoja-de-cotizar'
import { TotalGuardado } from './total-guardado'

type PropsDeLaHoja = {
  hoja: HojaDeUnaGuardada
  // El primer cálculo, por la cotización y con lo guardado como entradas: lo hizo el servidor con la lectura (C3).
  inicial: RecalculoInicial
}

type Props = PropsDeLaHoja & {
  // Quien mira: el pendiente y el borrador de la pestaña son suyos (otra cuenta en la misma pestaña no reenvía ni repone lo de ésta).
  personaId: string
}

// El marco de la hoja de una cotización guardada (`/cotizaciones/[id]`, 4.15-3). La hoja calcula por SU cotización (nunca por un origen) y abre con lo guardado como lo tipeado,
// así abrirla sin tocar nada no deja borrador. Quien no la puede guardar la lee en sólo lectura (P13). **Lo de hoy no siempre es lo guardado:** el recálculo usa las tablas de
// referencia y los datos del vehículo de hoy; si da otra cosa se dice y se muestra el total con que se guardó (C11, P2). Se decide una vez, al abrir: tipear después no lo cambia.
// Lleva lo que tiene que sobrevivir a que la hoja se vuelva a montar con la versión nueva —el guardado con su pendiente y su «Cambios guardados.»— y, **mientras guarda,
// congela las props de la hoja** (como la nueva): una action que renueva la cookie de la sesión vuelve a dibujar la página, y la hoja no cambia a medio guardar. Su `key` es el
// id de la cotización; la de la hoja, su versión (`actualizadoEn`) y la vuelta de «Descartar».
export function PantallaDeUnaGuardada({ personaId, ...props }: Props) {
  const [vuelta, setVuelta] = useState(0)
  const [vistas, setVistas] = useState<PropsDeLaHoja>(props)
  // El guardado se arma con la versión que se vio, no con la que llegue a medio guardar: la clave del borrador es la de la hoja que se ve.
  const { hoja, inicial } = vistas
  const borrador = claveDelBorradorDeUnaGuardada({
    personaId,
    cotizacionId: hoja.cotizacion.id,
    actualizadoEn: hoja.cotizacion.actualizadoEn,
  })
  // Lo guardado ya está en la base: el borrador se va.
  const guardado = useGuardadoDeUnaGuardada({
    personaId,
    cotizacionId: hoja.cotizacion.id,
    alGuardar: () => {
      guardarBorradorDeEstado(window.sessionStorage, borrador, {})
    },
  })
  const congelada = guardado.estado.tipo === 'guardando'
  if (!congelada && (vistas.hoja !== props.hoja || vistas.inicial !== props.inicial)) {
    setVistas(props)
  }
  // Otra versión (el «Recargar» de un conflicto abre la de la otra persona): el aviso del último guardado hablaba de la de antes. Lo guardado por este mismo guardado no se olvida:
  // «Cambios guardados.» se queda hasta el próximo cambio.
  const [versionVista, setVersionVista] = useState(hoja.cotizacion.actualizadoEn)
  if (versionVista !== hoja.cotizacion.actualizadoEn) {
    setVersionVista(hoja.cotizacion.actualizadoEn)
    if (guardado.estado.tipo === 'aviso') {
      guardado.olvidarAviso()
    }
  }
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
      key={`${hoja.cotizacion.actualizadoEn}:${String(vuelta)}`}
      hoja={diseno}
      inicial={inicial}
      vehiculoId={hoja.cotizacion.vehiculoId}
      vehiculoSoltado={false}
      leadId={hoja.cotizacion.leadId}
      guardado={null}
      abre={abre}
      soloLectura={!hoja.puedeGuardar}
      {...(hoja.puedeGuardar
        ? {
            edicion: { guardado, cotizacion: hoja.cotizacion, diferido: hayAviso },
            borrador: {
              clave: borrador,
              alDescartar: () => {
                setVuelta((v) => v + 1)
              },
            },
          }
        : {})}
      totalGuardado={
        <TotalGuardado
          totalUsd={hoja.guardado.totalUsd}
          hayAviso={hayAviso}
          muestraElTotal={muestraElTotal}
          puedeGuardar={hoja.puedeGuardar}
        />
      }
    />
  )
}
