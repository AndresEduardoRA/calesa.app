'use client'

import { useMemo } from 'react'
import { EstiloDeTonos, SimbolosDeXCell } from '@/shared/ui/xcell'
import { seccionSeDibuja, type ContextoDeHoja } from '../../../entities/binding'
import type { HojaDeLaVistaPrevia } from '../../../entities/diseno/hoja-del-diseno'
import { entradasIniciales, indiceDeHoja } from '../../../entities/entradas'
import type { RespuestaDeRecalculo } from '../../../entities/recalculo'
import type { AccionesDeHoja } from '../../hoja/hooks/use-hoja'
import { CabeceraDeHoja } from '../../hoja/components/cabecera-de-hoja'
import { ResumenDeHoja } from '../../hoja/components/resumen-de-hoja'
import { SeccionDeHoja } from '../../hoja/components/seccion-de-hoja'

type Props = { hoja: HojaDeLaVistaPrevia; respuesta: RespuestaDeRecalculo | null }

const nada = () => undefined
// La hoja de prueba sólo se ve: sus acciones no hacen nada (y el marco la pone `inert`).
const ACCIONES_QUIETAS: AccionesDeHoja = {
  alConfirmar: nada,
  alRestablecer: nada,
  alAlternarBandera: nada,
  alElegirVariante: nada,
  alElegirModo: nada,
  alElegirAtajo: nada,
}

const ESTADO_AL_DIA = { tipo: 'al_dia' } as const

const plural = (n: number) => (n === 1 ? 'sección va' : 'secciones van')

// La hoja de cotizar con el diseño que se edita (4.22-5): los mismos componentes de la hoja de verdad (cabecera, secciones y resumen), con sus mismos cortes por contenedor, sobre cifras
// de prueba. No usa `LugaresDeLaHoja` (arrastra `?ayuda=` y `?panel=` de la URL, que aquí chocarían con la pestaña) ni dibuja las secciones «avanzado»: las nombra aparte.
export function HojaDePrueba({ hoja, respuesta }: Props) {
  const indice = useMemo(
    () => indiceDeHoja(hoja.secciones, hoja.cabecera.modos),
    [hoja.secciones, hoja.cabecera.modos],
  )
  const contexto = useMemo<ContextoDeHoja>(
    () => ({ indice, entradas: entradasIniciales(indice), respuesta }),
    [indice, respuesta],
  )
  const principales = hoja.secciones.filter(
    (s) => s.presentacion === 'principal' && seccionSeDibuja(s, contexto),
  )
  const avanzadas = hoja.secciones.filter((s) => s.presentacion === 'avanzado')
  if (principales.length === 0 && avanzadas.length === 0) {
    return (
      <p className="p-4 text-(length:--text-sm) text-(--color-ink-soft)">
        No hay nada que dibujar.
      </p>
    )
  }
  const modo = hoja.cabecera.modos.find((m) => m.clave === contexto.entradas.modoTc)?.nombre ?? null
  return (
    <div data-hoja-de-prueba="" className="@container/hoja grid min-w-0 gap-4 p-3">
      <SimbolosDeXCell />
      <EstiloDeTonos tonos={hoja.tonos} />
      <div className="flex min-w-0 flex-col gap-4 @4xl/hoja:flex-row @4xl/hoja:items-start">
        <div className="grid min-w-0 flex-1 gap-4">
          <CabeceraDeHoja
            cabecera={hoja.cabecera}
            modoElegido={contexto.entradas.modoTc}
            alElegirModo={nada}
            verTotalBs={false}
            alCambiarVerTotalBs={nada}
          />
          <div data-secciones="" className="@container min-w-0">
            <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 @5xl:grid-cols-2">
              {principales.map((seccion) => (
                <SeccionDeHoja
                  key={seccion.id}
                  seccion={seccion}
                  contexto={contexto}
                  acciones={ACCIONES_QUIETAS}
                />
              ))}
            </div>
          </div>
          {avanzadas.length === 0 ? null : (
            <p data-avanzadas="" className="text-(length:--text-sm) text-(--color-ink-soft)">
              {avanzadas.length} {plural(avanzadas.length)} detrás del botón «Avanzado» de la hoja:{' '}
              {avanzadas.map((s) => s.titulo ?? s.id).join(', ')}.
            </p>
          )}
        </div>
        <ResumenDeHoja
          tarjeta={hoja.tarjetaTotal}
          monedaDelTotalBs={null}
          modo={modo}
          contexto={contexto}
          estado={ESTADO_AL_DIA}
          avisoDelVehiculo={null}
          alReintentar={nada}
          alRecargar={nada}
          guardar={null}
          avisoDeGuardado={null}
        />
      </div>
    </div>
  )
}
