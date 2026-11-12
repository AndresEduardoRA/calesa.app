'use client'

import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { DesdeUnaFecha } from '@/shared/ui/desde-una-fecha'
import { IrAUnaFecha } from '@/shared/ui/ir-a-una-fecha'
import type { ListaDeLaUnidad } from '../hooks/use-lista-de-la-unidad'

type Props = {
  lista: ListaDeLaUnidad<unknown>
  zona: string
  // Lo que se lista, en plural y con su artículo: «las notas», «los cambios».
  sustantivo: { plural: string; articulo: 'los' | 'las' }
}

const CAMINO = 'Para ver anteriores, ve a una fecha.'

// «Desde el 5 nov 2026» con «Volver a los más recientes», arriba de la lista, mientras se mira desde una fecha.
export function DesdeLaFecha({ lista, zona }: Pick<Props, 'lista' | 'zona'>) {
  if (lista.desde === null) return null
  return (
    <DesdeUnaFecha
      dia={lista.desde}
      zona={zona}
      ocupado={lista.pidiendo}
      volver="Volver a los más recientes"
      alVolver={lista.volverALosRecientes}
    />
  )
}

// Lo que sigue a la lista: el fallo de «Ver más» con «Reintentar», el aviso del tope o «Ver más», e «Ir a una fecha» mientras haya más hacia atrás o se mire desde una fecha.
export function PieDeLaLista({ lista, zona, sustantivo }: Props) {
  const { pidiendo, error } = lista
  return (
    <>
      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-2">
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{error.mensaje}</p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            disabled={pidiendo}
            onClick={lista.reintentar}
          >
            Reintentar
          </Button>
        </div>
      ) : lista.enElTope ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_LO_CARGADO, {
            sustantivo: sustantivo.plural,
            articulo: sustantivo.articulo,
          })}
          camino={CAMINO}
        />
      ) : lista.hayMasParaPedir ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-fit md:min-h-9"
          disabled={pidiendo}
          onClick={lista.verMas}
        >
          {pidiendo ? 'Cargando…' : 'Ver más'}
        </Button>
      ) : null}
      {lista.hayMasParaPedir || lista.enElTope || lista.desde !== null ? (
        <IrAUnaFecha zona={zona} ocupado={pidiendo} alIr={lista.irAUnaFecha} />
      ) : null}
    </>
  )
}
