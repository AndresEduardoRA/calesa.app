'use client'

import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import { FilterShell } from '@/shared/ui/filtros'
import type { PaginaDeActividad } from '../../../entities/actividad'
import type { PedidoDeActividad } from '../../../entities/filtros'
import { AvisoDeUnRegistro } from './aviso-de-un-registro'
import { ResultadoDeActividad } from './resultado-de-actividad'

type Props = {
  inicial: PaginaDeActividad
  pedido: PedidoDeActividad
  esquema: EsquemaDeFiltros
  hoy: string
  diasDeActividad: number
  // La etiqueta de la entidad cuando la lista es la de un solo registro (`?entidad=` y `?registro=`); nulo si no.
  entidadDelRegistro: string | null
}

// `/actividad`: los filtros de persona y entidad en la URL y, adentro, la actividad por día. La página le pone una `key` por filtros: otros
// filtros empiezan de cero.
export function ListadoDeActividad({ esquema, entidadDelRegistro, ...resultado }: Props) {
  return (
    <div className="grid gap-4">
      {entidadDelRegistro !== null ? <AvisoDeUnRegistro entidad={entidadDelRegistro} /> : null}
      <FilterShell esquema={esquema}>
        <ResultadoDeActividad {...resultado} />
      </FilterShell>
    </div>
  )
}
