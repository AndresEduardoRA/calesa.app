'use client'

import { textoDelTope } from '@/shared/lib/conteo'
import { formatearFecha } from '@/shared/lib/fechas'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { IrAUnaFecha } from '@/shared/ui/ir-a-una-fecha'
import type { Comentarios } from '../hooks/use-comentarios'

const CAMINO = 'Para ver anteriores, ve a una fecha.'

// Lo que sigue a la lista: el fallo de «Ver más comentarios» con «Reintentar», el aviso del tope o «Ver más comentarios», e «Ir a una fecha» mientras haya más
// hacia atrás o se mire desde una fecha. Con un pedido en vuelo, todo lo que pide queda apagado.
export function PieDeComentarios({
  comentarios,
  zona,
}: {
  comentarios: Comentarios
  zona: string
}) {
  const { ocupado, desde } = comentarios
  return (
    <>
      {comentarios.falloDeRaices ? (
        <div role="alert" className="flex flex-wrap items-center gap-2">
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            {comentarios.falloDeRaices.mensaje}
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            disabled={ocupado}
            onClick={comentarios.reintentar}
          >
            Reintentar
          </Button>
        </div>
      ) : comentarios.enElTope ? (
        <AvisoDeTope texto={textoDelTope(TOPE_DE_LO_CARGADO)} camino={CAMINO} />
      ) : comentarios.hayMasParaPedir ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-fit md:min-h-9"
          disabled={ocupado}
          onClick={comentarios.verMas}
        >
          {comentarios.cargandoMas ? 'Cargando…' : 'Ver más comentarios'}
        </Button>
      ) : null}
      {comentarios.lista.hayMas || desde !== null ? (
        <IrAUnaFecha zona={zona} ocupado={ocupado} alIr={comentarios.irAUnaFecha} />
      ) : null}
    </>
  )
}

// «Comentarios hasta el 5 nov 2026» con «Volver a los más recientes», arriba de la lista, mientras se mira desde una fecha.
export function DesdeUnaFecha({ comentarios, zona }: { comentarios: Comentarios; zona: string }) {
  if (comentarios.desde === null) {
    return null
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Comentarios hasta el {formatearFecha(comentarios.desde, { zona })}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11 md:min-h-7"
        disabled={comentarios.ocupado}
        onClick={comentarios.volverALosRecientes}
      >
        Volver a los más recientes
      </Button>
    </div>
  )
}
