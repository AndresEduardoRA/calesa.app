'use client'

import type { VistaGuardada } from '@/modules/equipo/client'
import type { OrigenResumen } from '@/modules/origenes/client'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import type { Pagina } from '@/shared/lib/paginacion'
import { Aviso } from '@/shared/ui/aviso'
import { FilterShell } from '@/shared/ui/filtros'
import { camposFiltrables } from '../../../entities/filtros'
import type { PermisoDeAlta } from '../../../entities/permisos'
import type { Vehiculo } from '../../../entities/vehiculo'
import { BotonNuevoVehiculo, ID_DEL_MOTIVO_DE_ALTA } from '../../alta/components/botones'
import type { DisponibilidadDeApibara } from '../../../entities/apibara'
import { PanelDeVehiculo } from '../../alta/components/panel-de-vehiculo'
import { EnlaceAPapelera } from '../../papelera/components/enlace-a-papelera'
import { PestanasDeOrigen } from './pestanas-de-origen'
import { PieDeFiltros } from './pie-de-filtros'
import { ResultadoDelListado } from './resultado-del-listado'
import type { DatosDelOrigen, FilaDeVehiculo } from './tipos'
import { VistasDeVehiculos } from './vistas-de-vehiculos'

type Props = DatosDelOrigen & {
  // Las pestañas: los orígenes donde la persona ve vehículos.
  origenes: readonly OrigenResumen[]
  esquema: EsquemaDeFiltros
  pagina: Pagina<FilaDeVehiculo>
  // «Ítems por página»: lo que dibuja esta página y hasta cuánto ofrece el selector.
  porPagina: { valor: number; opciones: readonly number[] }
  vistas: readonly VistaGuardada[]
  puedeConfigurarCampos: boolean
  // Si puede dar de alta en este origen, y por qué no cuando el origen está desactivado.
  permisoDeAlta: PermisoDeAlta
  // Los vehículos de esta página que puede editar, y el que está editando (`?editar=`).
  editables: readonly string[]
  enEdicion: Vehiculo | null
  // Los que puede enviar a la papelera (se eligen y se mandan juntos), y si puede abrirla.
  eliminables: readonly string[]
  verPapelera: boolean
  // Si el alta de este origen puede traer la ficha de apibara.
  apibara: DisponibilidadDeApibara
}

// El inventario: una pestaña por origen y, adentro, los filtros de ese origen, su lista y el
// panel de alta y edición. Todo el estado (origen, filtros, página, panel) vive en la URL.
export function ListadoDeVehiculos(props: Props) {
  const {
    origenes,
    esquema,
    vistas,
    puedeConfigurarCampos,
    permisoDeAlta,
    enEdicion,
    porPagina,
    ...demas
  } = props
  const { verPapelera, apibara, ...resto } = demas
  const { origen, campos, categorias } = resto
  const nuevo = <BotonNuevoVehiculo origen={origen} permiso={permisoDeAlta} />
  return (
    <div className="grid gap-4">
      <PestanasDeOrigen origenes={origenes} actual={origen.id} />
      {permisoDeAlta.estado === 'deshabilitado' ? (
        <div id={ID_DEL_MOTIVO_DE_ALTA}>
          <Aviso>{permisoDeAlta.motivo}</Aviso>
        </div>
      ) : null}
      {/* Los filtros salen del layout de cada origen: al cambiar de pestaña se arma otro. */}
      <FilterShell
        key={origen.id}
        esquema={esquema}
        porPagina={porPagina}
        vistas={<VistasDeVehiculos esquema={esquema} origenId={origen.id} vistas={vistas} />}
        acciones={
          <>
            {verPapelera ? <EnlaceAPapelera /> : null}
            {nuevo}
          </>
        }
        pieDelPanel={
          <PieDeFiltros
            origen={origen}
            filtrables={camposFiltrables(campos).length}
            puedeConfigurar={puedeConfigurarCampos}
          />
        }
      >
        <ResultadoDelListado
          {...resto}
          accionDeVacio={permisoDeAlta.estado === 'habilitado' ? nuevo : undefined}
        />
      </FilterShell>
      <PanelDeVehiculo
        origen={origen}
        campos={campos}
        categorias={categorias}
        puedeCrear={permisoDeAlta.estado === 'habilitado'}
        enEdicion={enEdicion}
        apibara={apibara}
      />
    </div>
  )
}
