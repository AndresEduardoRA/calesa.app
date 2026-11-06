'use client'

import { textoDelTope } from '@/shared/lib/conteo'
import { formatearFecha } from '@/shared/lib/fechas'
import { formatearNumero, LOCALE_POR_DEFECTO } from '@/shared/lib/formato'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { IrAUnaFecha } from '@/shared/ui/ir-a-una-fecha'
import type { useRevisiones } from '../hooks/use-revisiones'

type Props = {
  revisiones: ReturnType<typeof useRevisiones>
  zona: string
}

const CAMINO = 'Para ver anteriores, ve a una fecha.'

// Lo que sigue a la lista: el error del último pedido con «Reintentar», el aviso del tope o «Ver más», y «Ir a una fecha» mientras haya más hacia atrás o se mire desde una fecha.
// Con cualquier pedido en vuelo, todo lo que pide queda apagado, sin cambiar su texto.
export function PieDeRevisiones({ revisiones, zona }: Props) {
  const { desde, ocupado } = revisiones
  return (
    <>
      {revisiones.error ? (
        <div role="alert" className="flex flex-wrap items-center gap-2">
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            {textoDelError(revisiones.fallido, zona)}
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            disabled={ocupado}
            onClick={revisiones.reintentar}
          >
            Reintentar
          </Button>
        </div>
      ) : revisiones.enElTope ? (
        <AvisoDeTope texto={textoDelAviso(desde, zona)} camino={CAMINO} />
      ) : revisiones.hayMasParaPedir ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={ocupado}
          onClick={revisiones.verMas}
        >
          {revisiones.cargandoMas ? 'Cargando…' : 'Ver más'}
        </Button>
      ) : null}
      {revisiones.siguiente !== null || desde !== null ? (
        <IrAUnaFecha
          zona={zona}
          ocupado={ocupado}
          alIr={(dia) => {
            revisiones.irAUnaFecha(dia, zona)
          }}
        />
      ) : null}
    </>
  )
}

// «Mostrando las 500 más recientes.» desde la más nueva; «Mostrando 500 desde el …» desde una fecha.
function textoDelAviso(desde: string | null, zona: string): string {
  if (desde === null) {
    return textoDelTope(TOPE_DE_LO_CARGADO, { articulo: 'las' })
  }
  return `Mostrando ${formatearNumero(TOPE_DE_LO_CARGADO, { locale: LOCALE_POR_DEFECTO })} desde el ${formatearFecha(desde, { zona })}.`
}

function textoDelError(fallido: Props['revisiones']['fallido'], zona: string): string {
  if (fallido?.clase === 'salto') {
    return `No se pudieron cargar las revisiones hasta el ${formatearFecha(fallido.dia, { zona })}.`
  }
  return fallido?.clase === 'volver'
    ? 'No se pudieron cargar las más recientes.'
    : 'No se pudieron cargar más.'
}
