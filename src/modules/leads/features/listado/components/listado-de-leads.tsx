'use client'

import type { VistaGuardada } from '@/modules/equipo/client'
import { camposFiltrables, type EsquemaDeFiltros } from '@/shared/lib/filtros'
import type { Pagina } from '@/shared/lib/paginacion'
import { Button } from '@/shared/ui/button'
import { FilterShell, useFiltrosDelListado } from '@/shared/ui/filtros'
import type { ModoDelListado } from '../../../entities/alcance'
import { privadosFiltrando, type FiltroDescartado } from '../../../entities/filtros'
import { SECCION_MARCAS } from '../../../entities/filtros-de-marcas'
import type { FilaDeLead } from '../../../entities/listado'
import { ConmutadorDeVista } from '../../embudo/components/conmutador-de-vista'
import { AccionesDeCsv } from '../../exportar/components/acciones-de-csv'
import { DialogoDeEtiquetas } from '../../etiquetas/components/dialogo-de-etiquetas'
import { useEtiquetas } from '../../etiquetas/hooks/use-etiquetas'
import { usePanelDeEtiquetas } from '../../etiquetas/hooks/use-panel-de-etiquetas'
import { RefrescarAlVolver } from '../../ficha/components/refrescar-al-volver'
import { EnlaceAPapeleraDeLeads } from '../../papelera/components/enlace-a-papelera'
import { DrawerDeLead } from '../../rapido/components/drawer-de-lead'
import { useDrawerDeLead } from '../../rapido/hooks/use-drawer-de-lead'
import { AvisoDeFiltrosDescartados } from './aviso-de-filtros-descartados'
import { AvisoDePrivados } from './aviso-de-privados'
import { AvisoDeTachadosOcultos } from './aviso-de-tachados-ocultos'
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
  puedeExportar: boolean
  puedeConfigurarCampos: boolean
  descartados: readonly FiltroDescartado[]
  ocultos: number
  eliminables: readonly string[]
  puedeAbrirPapelera: boolean
}

// Lo que va arriba de la lista: lo que la URL traía y ya no vale, y la aclaración de un filtro
// privado en «todos».
function AvisosDelListado({
  campos,
  modo,
  descartados,
  ocultos,
  hayFilas,
}: Pick<Props, 'campos' | 'modo' | 'descartados' | 'ocultos'> & { hayFilas: boolean }) {
  const filtros = useFiltrosDelListado()
  const privados = modo === 'todos' ? privadosFiltrando(campos, filtros.valores) : []
  return (
    <>
      <AvisoDeFiltrosDescartados descartados={descartados} />
      <AvisoDePrivados etiquetas={privados} />
      {/* Sin filas lo dice el estado vacío, con el mismo «Mostrarlos». */}
      {hayFilas ? <AvisoDeTachadosOcultos ocultos={ocultos} /> : null}
    </>
  )
}

// El enlace de la sección «Tus marcas» del panel de filtros.
function GestionarEtiquetas({ alAbrir }: { alAbrir: () => void }) {
  return (
    <Button type="button" variant="link" className="h-11 w-fit px-0 md:h-auto" onClick={alAbrir}>
      Gestionar etiquetas
    </Button>
  )
}

// Lo que va a la derecha de la barra de filtros: la vista, el alcance, exportar y la papelera, cada
// uno sólo para quien puede.
function AccionesDelListado({
  modo,
  puedeVerTodos,
  puedeExportar,
  puedeCrear,
  puedeAbrirPapelera,
}: Pick<Props, 'modo' | 'puedeVerTodos' | 'puedeExportar' | 'puedeCrear' | 'puedeAbrirPapelera'>) {
  return (
    <>
      <ConmutadorDeVista actual="lista" />
      {puedeVerTodos ? <SelectorDeAlcance modo={modo} /> : null}
      <AccionesDeCsv puedeExportar={puedeExportar} puedeImportar={puedeCrear} />
      {puedeAbrirPapelera ? <EnlaceAPapeleraDeLeads /> : null}
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
    puedeExportar,
    puedeConfigurarCampos,
    descartados,
    ocultos,
    eliminables,
    puedeAbrirPapelera,
    ...delServidor
  } = props
  const drawer = useDrawerDeLead()
  const etiquetas = useEtiquetas(delServidor.etiquetas)
  const gestionar = usePanelDeEtiquetas()
  // La lista local: una etiqueta recién creada nombra la fila antes de que vuelva el servidor.
  const datos = { ...delServidor, etiquetas: etiquetas.lista }
  return (
    <div className="grid gap-4">
      <h1 className="sr-only">Leads</h1>
      <FilterShell
        esquema={esquema}
        vistas={<VistasDeLeads esquema={esquema} vistas={vistas} modo={modo} />}
        acciones={
          <AccionesDelListado
            modo={modo}
            puedeVerTodos={puedeVerTodos}
            puedeExportar={puedeExportar}
            puedeCrear={puedeCrear}
            puedeAbrirPapelera={puedeAbrirPapelera}
          />
        }
        accionesDeSeccion={{ [SECCION_MARCAS]: <GestionarEtiquetas alAbrir={gestionar.abrir} /> }}
        pieDelPanel={
          <PieDeFiltros
            filtrables={camposFiltrables(datos.campos).length}
            puedeConfigurar={puedeConfigurarCampos}
          />
        }
      >
        <div className="grid gap-3">
          <AvisosDelListado
            campos={datos.campos}
            modo={modo}
            descartados={descartados}
            ocultos={ocultos}
            hayFilas={pagina.filas.length > 0}
          />
          <ResultadoDelListado
            {...datos}
            pagina={pagina}
            modo={modo}
            puedeVerTodos={puedeVerTodos}
            puedeCrear={puedeCrear}
            alAbrir={drawer.abrir}
            abierto={drawer.id}
            marcar={{ etiquetas, alGestionar: gestionar.abrir, eliminables }}
            ocultos={ocultos}
          />
        </div>
      </FilterShell>
      <DrawerDeLead {...datos} filas={pagina.filas} soloMios={!puedeVerTodos} />
      <DialogoDeEtiquetas etiquetas={etiquetas} />
      {/* Lo que se marcó en otra pestaña (o la ficha) aparece al volver, sin recargar a mano. */}
      <RefrescarAlVolver activo={!gestionar.abierto} />
    </div>
  )
}
