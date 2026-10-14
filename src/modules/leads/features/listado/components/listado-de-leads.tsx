'use client'

import type { VistaGuardada } from '@/modules/equipo/client'
import { camposFiltrables, type EsquemaDeFiltros } from '@/shared/lib/filtros'
import type { Pagina } from '@/shared/lib/paginacion'
import { FilterShell, useFiltrosDelListado } from '@/shared/ui/filtros'
import type { ModoDelListado } from '../../../entities/alcance'
import { privadosFiltrando, type FiltroDescartado } from '../../../entities/filtros'
import type { FilaDeLead } from '../../../entities/listado'
import { DrawerDeLead } from '../../rapido/components/drawer-de-lead'
import { useDrawerDeLead } from '../../rapido/hooks/use-drawer-de-lead'
import { AvisoDeFiltrosDescartados } from './aviso-de-filtros-descartados'
import { AvisoDePrivados } from './aviso-de-privados'
import { PieDeFiltros } from './pie-de-filtros'
import { ResultadoDelListado } from './resultado-del-listado'
import { SelectorDeAlcance } from './selector-de-alcance'
import type { DatosDeLaLista } from './tipos'
import { VistasDeLeads } from './vistas-de-leads'

type Props = DatosDeLaLista & {
  esquema: EsquemaDeFiltros
  pagina: Pagina<FilaDeLead>
  vistas: readonly VistaGuardada[]
  modo: ModoDelListado
  puedeVerTodos: boolean
  puedeCrear: boolean
  puedeConfigurarCampos: boolean
  descartados: readonly FiltroDescartado[]
}

// Lo que va arriba de la lista: lo que la URL traía y ya no vale, y la aclaración de un filtro
// privado en «todos».
function AvisosDelListado({
  campos,
  modo,
  descartados,
}: Pick<Props, 'campos' | 'modo' | 'descartados'>) {
  const filtros = useFiltrosDelListado()
  const privados = modo === 'todos' ? privadosFiltrando(campos, filtros.valores) : []
  return (
    <>
      <AvisoDeFiltrosDescartados descartados={descartados} />
      <AvisoDePrivados etiquetas={privados} />
    </>
  )
}

// Los leads: filtros del layout en la URL, vistas guardadas, la lista (tabla o tarjetas) y el
// drawer rápido. Todo el estado (filtros, alcance, página, lead abierto) vive en la URL.
export function ListadoDeLeads(props: Props) {
  const {
    esquema,
    pagina,
    vistas,
    modo,
    puedeVerTodos,
    puedeCrear,
    puedeConfigurarCampos,
    descartados,
    ...datos
  } = props
  const drawer = useDrawerDeLead()
  return (
    <div className="grid gap-4">
      <h1 className="sr-only">Leads</h1>
      <FilterShell
        esquema={esquema}
        vistas={<VistasDeLeads esquema={esquema} vistas={vistas} modo={modo} />}
        acciones={puedeVerTodos ? <SelectorDeAlcance modo={modo} /> : null}
        pieDelPanel={
          <PieDeFiltros
            filtrables={camposFiltrables(datos.campos).length}
            puedeConfigurar={puedeConfigurarCampos}
          />
        }
      >
        <div className="grid gap-3">
          <AvisosDelListado campos={datos.campos} modo={modo} descartados={descartados} />
          <ResultadoDelListado
            {...datos}
            pagina={pagina}
            modo={modo}
            puedeVerTodos={puedeVerTodos}
            puedeCrear={puedeCrear}
            alAbrir={drawer.abrir}
            abierto={drawer.id}
          />
        </div>
      </FilterShell>
      <DrawerDeLead {...datos} filas={pagina.filas} soloMios={!puedeVerTodos} />
    </div>
  )
}
