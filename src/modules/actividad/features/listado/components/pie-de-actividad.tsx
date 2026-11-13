'use client'

import { textoDelTope } from '@/shared/lib/conteo'
import { formatearFecha } from '@/shared/lib/fechas'
import { formatearNumero, LOCALE_POR_DEFECTO } from '@/shared/lib/formato'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { IrAUnaFecha } from '@/shared/ui/ir-a-una-fecha'
import type { ActividadCargada } from '../hooks/use-actividad'

type Props = { actividad: ActividadCargada; zona: string }

const CAMINO = 'Para ver anteriores, ve a una fecha.'

// Lo que sigue a la lista: el error del último pedido con «Reintentar», el aviso del tope o «Ver más», «Ir a una fecha» mientras haya más
// hacia atrás o se mire desde una fecha, y «Volver a lo más reciente». Con un pedido en vuelo, todo lo que pide queda apagado sin cambiar su texto.
export function PieDeActividad({ actividad, zona }: Props) {
  const { desde, ocupado } = actividad
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actividad.error ? (
        <div role="alert" className="flex flex-wrap items-center gap-2">
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            {textoDelError(actividad.fallido, zona)}
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            disabled={ocupado}
            onClick={actividad.reintentar}
          >
            Reintentar
          </Button>
        </div>
      ) : actividad.enElTope ? (
        <AvisoDeTope texto={textoDelAviso(desde, zona)} camino={CAMINO} />
      ) : actividad.hayMasParaPedir ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={ocupado}
          onClick={actividad.verMas}
        >
          {actividad.cargandoMas ? 'Cargando…' : 'Ver más'}
        </Button>
      ) : null}
      {actividad.siguiente !== null || desde !== null ? (
        <IrAUnaFecha zona={zona} ocupado={ocupado} alIr={actividad.irAUnaFecha} />
      ) : null}
      {desde !== null ? <VolverALoMasReciente actividad={actividad} /> : null}
    </div>
  )
}

export function VolverALoMasReciente({ actividad }: { actividad: ActividadCargada }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="min-h-11 md:min-h-9"
      disabled={actividad.ocupado}
      onClick={actividad.volver}
    >
      Volver a lo más reciente
    </Button>
  )
}

// «Mostrando los 500 más recientes.» desde lo más nuevo; «Mostrando 500 desde el …» desde una fecha.
function textoDelAviso(desde: string | null, zona: string): string {
  if (desde === null) {
    return textoDelTope(TOPE_DE_LO_CARGADO, { articulo: 'los' })
  }
  return `Mostrando ${formatearNumero(TOPE_DE_LO_CARGADO, { locale: LOCALE_POR_DEFECTO })} desde el ${formatearFecha(desde, { zona })}.`
}

function textoDelError(fallido: ActividadCargada['fallido'], zona: string): string {
  if (fallido?.clase === 'salto' && fallido.dia !== null) {
    return `No se pudo cargar la actividad hasta el ${formatearFecha(fallido.dia, { zona })}.`
  }
  return fallido?.clase === 'volver'
    ? 'No se pudo cargar lo más reciente.'
    : 'No se pudo cargar más.'
}
