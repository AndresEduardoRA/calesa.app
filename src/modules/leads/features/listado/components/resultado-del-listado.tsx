'use client'

import { useSearchParams } from 'next/navigation'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import type { Pagina } from '@/shared/lib/paginacion'
import { Button } from '@/shared/ui/button'
import { EstadoPaginaSinFilas, EstadoSinResultados, EstadoVacio } from '@/shared/ui/estados'
import { useFiltrosDelListado } from '@/shared/ui/filtros'
import { Paginacion } from '@/shared/ui/paginacion'
import type { ModoDelListado } from '../../../entities/alcance'
import type { FilaDeLead } from '../../../entities/listado'
import { usePanelDeAlta } from '../../alta/hooks/use-panel-de-alta'
import { useAlcanceDelListado } from '../hooks/use-alcance-del-listado'
import { TablaDeLeads } from './tabla-de-leads'
import { TarjetasDeLeads } from './tarjetas-de-leads'
import type { DatosDeLaLista } from './tipos'

type Props = DatosDeLaLista & {
  pagina: Pagina<FilaDeLead>
  modo: ModoDelListado
  puedeVerTodos: boolean
  puedeCrear: boolean
  alAbrir: (id: string) => void
  abierto: string | null
}

// Sin leads, y sin filtros ni cursor que lo expliquen: la frase y la salida que corresponde.
function VacioDeLeads({
  modo,
  puedeVerTodos,
  puedeCrear,
}: Pick<Props, 'modo' | 'puedeVerTodos' | 'puedeCrear'>) {
  const alta = usePanelDeAlta()
  const alcance = useAlcanceDelListado()
  const acciones = (
    <div className="flex flex-wrap justify-center gap-2">
      {puedeCrear ? (
        <Button type="button" onClick={alta.abrir}>
          Nuevo lead
        </Button>
      ) : null}
      {modo === 'mios' && puedeVerTodos ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            alcance.cambiar('todos')
          }}
        >
          Ver todos
        </Button>
      ) : null}
    </div>
  )
  return (
    <EstadoVacio
      titulo={modo === 'mios' ? 'Todavía no tienes leads en tu cartera' : 'Todavía no hay leads'}
      descripcion={
        puedeCrear
          ? 'Los que registres, y los que te compartan, van a aparecer acá.'
          : 'Los que te compartan van a aparecer acá.'
      }
      accion={puedeCrear || (modo === 'mios' && puedeVerTodos) ? acciones : undefined}
    />
  )
}

// La lista de leads o el estado que corresponda: sin leads, sin resultados por filtro o una página
// que se quedó sin filas. La tabla (escritorio) y las tarjetas (celular) están las dos en el DOM.
export function ResultadoDelListado(props: Props) {
  const { pagina, modo, puedeVerTodos, puedeCrear, alAbrir, abierto, ...datos } = props
  const filtros = useFiltrosDelListado()
  const hayCursor = useSearchParams().has(CLAVE_DE_CURSOR)

  if (pagina.filas.length === 0) {
    if (filtros.hayFiltros) {
      return <EstadoSinResultados alLimpiar={filtros.limpiar} />
    }
    if (hayCursor) {
      return <EstadoPaginaSinFilas />
    }
    return <VacioDeLeads modo={modo} puedeVerTodos={puedeVerTodos} puedeCrear={puedeCrear} />
  }

  return (
    <div className="grid gap-3">
      <div className="hidden md:block">
        <TablaDeLeads {...datos} leads={pagina.filas} alAbrir={alAbrir} abierto={abierto} />
      </div>
      <TarjetasDeLeads {...datos} leads={pagina.filas} alAbrir={alAbrir} />
      <Paginacion siguiente={pagina.siguiente} anterior={pagina.anterior} />
    </div>
  )
}
