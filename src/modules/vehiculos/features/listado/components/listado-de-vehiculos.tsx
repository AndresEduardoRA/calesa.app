'use client'

import type { VistaGuardada } from '@/modules/equipo/client'
import type { ComponentProps } from 'react'
import type { OrigenResumen } from '@/modules/origenes/client'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import type { Pagina } from '@/shared/lib/paginacion'
import { Aviso } from '@/shared/ui/aviso'
import { FilterShell } from '@/shared/ui/filtros'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { VistaDeLista } from '@/shared/lib/vista-de-lista'
import type { AlcanceDeAvisos } from '../../../entities/avisos-de-vehiculo'
import type { AprobadasDeLaPagina } from '../../../entities/cotizacion-aprobada-de-la-fila'
import { camposFiltrables } from '../../../entities/filtros'
import type { PermisoDeAlta } from '../../../entities/permisos'
import type { ParaCotizar } from '../../../entities/ruta-para-cotizar'
import type { Vehiculo } from '../../../entities/vehiculo'
import type { PermisoDeVitrina } from '../../../entities/vitrina'
import { BotonNuevoVehiculo, ID_DEL_MOTIVO_DE_ALTA } from '../../alta/components/botones'
import type { DisponibilidadDeApibara } from '../../../entities/apibara'
import { PanelDeVehiculo } from '../../alta/components/panel-de-vehiculo'
import { EnlaceAPapelera } from '../../papelera/components/enlace-a-papelera'
import { ResumenDeVehiculoDiferido } from '../../resumen/components/diferidos'
import { useResumenDeVehiculo } from '../../resumen/hooks/use-resumen-de-vehiculo'
import { useVistaDelInventario } from '../hooks/use-vista-del-inventario'
import { PestanasDeOrigen } from './pestanas-de-origen'
import { PieDeFiltros } from './pie-de-filtros'
import { ResultadoDelListado } from './resultado-del-listado'
import type { DatosDelOrigen, FilaDeVehiculo } from './tipos'
import { VistasDeVehiculos } from './vistas-de-vehiculos'
import { ProveedorDeMarcasDeVisto } from '@/modules/equipo/client'
import { resolverAcciones, SIN_ACCIONES } from '@/shared/lib/acciones-del-aviso'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros/url'
import { AccionesDelAviso } from '@/shared/ui/acciones-del-aviso'
import { CLAVE_DE_ALTA, PANEL_DEL_VEHICULO } from '../../panel-para-cotizar/claves'

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
  // De los de esta página, cuáles tienen un lead que puede abrir, y lo que puede abrir desde un aviso («Ver el lead», «Ver en logística»…).
  leadsVisibles: readonly string[]
  alcance: AlcanceDeAvisos
  verPapelera: boolean
  // La cotización aprobada de cada vehículo de la página, armada por `src/app` (la ruta de cada una es de `cotizaciones`); nulo si quien mira no ve cotizaciones.
  aprobadas: AprobadasDeLaPagina | null
  // Si el alta de este origen puede traer la ficha de apibara.
  apibara: DisponibilidadDeApibara
  // Si puede publicar en la web lo de este origen.
  publicar: PermisoDeVitrina
  // «Interesados» del resumen: sólo con `leads.ver`.
  verInteresados: boolean
  // «Cotizar» del resumen: la hoja de cotizar de este origen, o null si no cotiza en él (lo decide la página).
  paraCotizar: ParaCotizar | null
  // Tabla o tarjetas en escritorio, lo que eligió la última vez (`vehiculos.vista`); null = nunca eligió.
  vistaPreferida: VistaDeLista | null
}

// Por qué «Nuevo» está apagado (el origen está desactivado), arriba de la lista.
// Sin alta suelta pero con la de cotizar, el aviso lleva a la hoja con el panel del vehículo en alta (si quien mira cotiza en este origen).
function MotivoDeAlta({
  permiso,
  paraCotizar,
}: {
  permiso: PermisoDeAlta
  paraCotizar: ParaCotizar | null
}) {
  if (permiso.estado !== 'deshabilitado') {
    return null
  }
  const acciones =
    permiso.desdeCotizar && paraCotizar
      ? resolverAcciones([
          {
            accion: {
              tipo: 'ir',
              etiqueta: 'Cotizar un vehículo nuevo',
              ruta: rutaDeAltaEnLaHoja(paraCotizar),
            },
            puede: true,
          },
        ])
      : SIN_ACCIONES
  return (
    <div id={ID_DEL_MOTIVO_DE_ALTA}>
      <Aviso>
        <p>{permiso.motivo}</p>
        <AccionesDelAviso resueltas={acciones} className="mt-2" />
      </Aviso>
    </div>
  )
}

// La lista con las marcas de «visto» de su página (una lectura) y el abierto marcado al abrirse.
function ResultadoConVistos(props: ComponentProps<typeof ResultadoDelListado>) {
  return (
    <ProveedorDeMarcasDeVisto
      modulo="vehiculos"
      tipo="vehiculo"
      ids={props.pagina.filas.map((fila) => fila.id)}
      abierto={props.abierto}
    >
      <ResultadoDelListado {...props} />
    </ProveedorDeMarcasDeVisto>
  )
}

// La hoja de cotizar del origen con el panel del vehículo abierto en el alta a mano.
function rutaDeAltaEnLaHoja(para: ParaCotizar): string {
  const [camino = '', consulta = ''] = para.ruta.split('?')
  const parametros = new URLSearchParams(consulta)
  parametros.set(CLAVE_DE_PANEL, PANEL_DEL_VEHICULO)
  parametros.set(CLAVE_DE_ALTA, 'mano')
  return `${camino}?${parametros.toString()}`
}

// El inventario: una pestaña por origen y, adentro, los filtros de ese origen, su lista y el
// panel de alta y edición. Todo el estado (origen, filtros, página, panel) vive en la URL.
export function ListadoDeVehiculos(props: Props) {
  const { origenes, esquema, vistas, puedeConfigurarCampos, permisoDeAlta, enEdicion, ...demas } =
    props
  const { verPapelera, apibara, verInteresados, paraCotizar, porPagina, vistaPreferida, ...resto } =
    demas
  const vista = useVistaDelInventario(vistaPreferida)
  const { origen, campos, categorias, fases, vitrina, limpiezaHoy, pagina, editables } = resto
  const nuevo = <BotonNuevoVehiculo origen={origen} permiso={permisoDeAlta} />
  const resumen = useResumenDeVehiculo({ verInteresados })
  // El resumen llega recién al abrirse (`diferido()`) y, una vez visto, queda montado para irse con su animación.
  const resumenMontado = useAbiertoAlgunaVez(resumen.id !== null)
  // El panel de edición va una vez por pantalla: con el resumen abierto se dibuja adentro (se apila encima: Esc, «Cancelar» y guardar
  // cierran sólo el panel y el resumen queda debajo); sin él, solo.
  const panel = (
    <PanelDeVehiculo
      origen={origen}
      campos={campos}
      categorias={categorias}
      puedeCrear={permisoDeAlta.estado === 'habilitado'}
      enEdicion={enEdicion}
      apibara={apibara}
    />
  )
  return (
    <div className="grid gap-4">
      {/* El título de la página para quien lee en voz alta: la barra de filtros ocupa la cabecera (como en `/leads`). */}
      <h1 className="sr-only">Vehículos</h1>
      <PestanasDeOrigen origenes={origenes} actual={origen.id} />
      <MotivoDeAlta permiso={permisoDeAlta} paraCotizar={paraCotizar} />
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
        <ResultadoConVistos
          {...resto}
          vista={vista.vista}
          alCambiarVista={vista.cambiar}
          alAbrir={resumen.abrir}
          abierto={resumen.id}
          accionDeVacio={permisoDeAlta.estado === 'habilitado' ? nuevo : undefined}
        />
      </FilterShell>
      {resumenMontado ? (
        <ResumenDeVehiculoDiferido
          origen={origen}
          campos={campos}
          fases={fases}
          categorias={categorias}
          vitrina={vitrina}
          limpiezaHoy={limpiezaHoy}
          filas={pagina.filas}
          editables={new Set(editables)}
          eliminables={new Set(resto.eliminables)}
          leadsVisibles={new Set(resto.leadsVisibles)}
          alcance={resto.alcance}
          publicar={resto.publicar}
          verInteresados={verInteresados}
          paraCotizar={paraCotizar}
        >
          {panel}
        </ResumenDeVehiculoDiferido>
      ) : null}
      {resumen.id === null ? panel : null}
    </div>
  )
}
