'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { fraseDelGrupo, unidadesDelGrupo } from '../../../entities/mover/grupo-del-lote'
import type { PedidoDelGrupo } from '../../../areas/mover/composicion.client'
import { useUnidadesDelGrupo } from '../hooks/use-unidades-del-grupo'
import { CuerpoDelLote } from './cuerpo-del-lote'

type Props = PedidoDelGrupo & {
  destinoInicial: string | null
  alHaberResultado: () => void
  alCerrar: () => void
}

const NOMBRE_DEL_GRUPO = { contenedor: 'contenedor', booking: 'reserva' } as const

// El lote de un grupo (6.04-3, D30): las unidades de un contenedor o una reserva que están en una misma fase (la de más unidades, D1). La frase dice cuántas entraron y cuántas no; «Marcar que
// llegó» de un contenedor abre esto (D11). Con más de 200, entran las primeras 200.
export function CuerpoDelGrupo({ destinoInicial, alHaberResultado, alCerrar, ...pedido }: Props) {
  const { lectura, reintentar } = useUnidadesDelGrupo(pedido)
  if (lectura.tipo === 'cargando') {
    return (
      <div aria-busy="true" aria-label="Cargando las unidades del grupo" className="grid gap-2">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
    )
  }
  if (lectura.tipo === 'error') {
    return (
      <div className="grid gap-3">
        <Aviso tono="peligro">
          <p>{lectura.error.mensaje}</p>
        </Aviso>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          onClick={reintentar}
        >
          Reintentar
        </Button>
      </div>
    )
  }
  const { fase, entran, fuera } = unidadesDelGrupo(lectura.unidades)
  if (fase === null) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink)">
        {`No hay unidades con fase en este ${NOMBRE_DEL_GRUPO[pedido.tipo]}.`}
      </p>
    )
  }
  const frase = [
    fraseDelGrupo(entran.length, fuera),
    lectura.hayMas ? 'Hay más de 200 en este grupo: se eligieron las primeras 200.' : null,
  ]
    .filter((texto) => texto !== null)
    .join(' ')
  return (
    <CuerpoDelLote
      origenId={pedido.origenId}
      fase={fase}
      unidades={entran.map((u) => ({ id: u.id, nombre: u.titulo }))}
      destinoInicial={destinoInicial}
      frase={frase}
      alHaberResultado={alHaberResultado}
      alCerrar={alCerrar}
    />
  )
}
