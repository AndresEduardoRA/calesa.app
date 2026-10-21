'use client'

import { useSearchParams } from 'next/navigation'
import type { ConteoAcotado } from '@/shared/lib/conteo'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { ubicacionDeLaPagina, type Pagina } from '@/shared/lib/paginacion'
import { Button } from '@/shared/ui/button'
import { EstadoPaginaSinFilas, EstadoSinResultados, EstadoVacio } from '@/shared/ui/estados'
import { useFiltrosDelListado } from '@/shared/ui/filtros'
import { SimbolosDeIconos } from '@/shared/ui/icono-del-catalogo/simbolos-de-iconos'
import { UnaSolaVista } from '@/shared/ui/lista'
import { Paginacion, UbicacionDeLaPagina } from '@/shared/ui/paginacion'
import { useRegional } from '@/shared/ui/regional'
import type { ModoDelListado } from '../../../entities/alcance'
import { iconosEnUso } from '../../../entities/catalogos'
import type { FilaDeLead } from '../../../entities/listado'
import { usePanelDeAlta } from '../../alta/hooks/use-panel-de-alta'
import { textoDeOcultos, useMostrarTachados } from './aviso-de-tachados-ocultos'
import { useAlcanceDelListado } from '../hooks/use-alcance-del-listado'
import { TablaDeLeads } from './tabla-de-leads'
import { TarjetasDeLeads } from './tarjetas-de-leads'
import type { DatosDeLaLista, ParaMarcar } from './tipos'

type Props = DatosDeLaLista & {
  pagina: Pagina<FilaDeLead>
  modo: ModoDelListado
  puedeVerTodos: boolean
  puedeCrear: boolean
  alAbrir: (id: string) => void
  abierto: string | null
  marcar: ParaMarcar
  // Los que cumplen los filtros y quedaron afuera por tachados (hasta el tope del aviso).
  ocultos: ConteoAcotado
}

// No hay nada que mostrar, pero porque está tachado: decirlo y ofrecer verlos, no «Nada coincide».
function TodoTachado({ ocultos }: { ocultos: ConteoAcotado }) {
  const mostrar = useMostrarTachados()
  const { locale } = useRegional()
  return (
    <EstadoVacio
      titulo="Lo que coincide está tachado"
      descripcion={textoDeOcultos(ocultos, locale)}
      accion={
        <Button type="button" onClick={mostrar}>
          Mostrarlos
        </Button>
      }
    />
  )
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
// que se quedó sin filas. Se dibuja una sola vista (`<UnaSolaVista>`): la tabla desde `md`, las tarjetas por debajo.
export function ResultadoDelListado(props: Props) {
  const { pagina, modo, puedeVerTodos, puedeCrear, alAbrir, abierto, marcar, ocultos, ...datos } =
    props
  const filtros = useFiltrosDelListado()
  const hayCursor = useSearchParams().has(CLAVE_DE_CURSOR)

  if (pagina.filas.length === 0) {
    if (ocultos.n > 0 && !hayCursor) {
      return <TodoTachado ocultos={ocultos} />
    }
    if (filtros.hayFiltros) {
      return <EstadoSinResultados alLimpiar={filtros.limpiar} />
    }
    if (hayCursor) {
      return <EstadoPaginaSinFilas />
    }
    return <VacioDeLeads modo={modo} puedeVerTodos={puedeVerTodos} puedeCrear={puedeCrear} />
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <UbicacionDeLaPagina ubicacion={ubicacionDeLaPagina(pagina)} />
      <SimbolosDeIconos claves={iconosEnUso(pagina.filas, datos.origenes, datos.tipos)} />
      <UnaSolaVista
        tabla={() => (
          <TablaDeLeads
            {...datos}
            leads={pagina.filas}
            alAbrir={alAbrir}
            abierto={abierto}
            marcar={marcar}
          />
        )}
        tarjetas={() => (
          <TarjetasDeLeads
            {...datos}
            leads={pagina.filas}
            alAbrir={alAbrir}
            abierto={abierto}
            marcar={marcar}
          />
        )}
      />
      <Paginacion siguiente={pagina.siguiente} anterior={pagina.anterior} />
    </div>
  )
}
