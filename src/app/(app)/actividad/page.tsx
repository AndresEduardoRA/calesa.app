import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import {
  CLAVE_DE_REGISTRO,
  ENTIDADES_DE_LA_ACTIVIDAD,
  claveDelPedido,
  esquemaDeFiltrosDeActividad,
  etiquetaDeEntidad,
  leerPaginaDeActividad,
  leerPersonasDeLaActividad,
  pedidoDeActividad,
} from '@/modules/actividad'
import { ListadoDeActividad } from '@/modules/actividad/pantallas/listado'
import { leerAjustes } from '@/modules/empresa'
import { puede, requerirSesion } from '@/modules/equipo'
import { datosO } from '@/shared/lib/errores'
import { diaEnZona, ZONA_POR_DEFECTO } from '@/shared/lib/fechas'
import { leerFiltros } from '@/shared/lib/filtros'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoListado } from '@/shared/ui/esqueletos'

export const metadata: Metadata = { title: 'Actividad' }

const SIN_PERMISO =
  'No tienes permiso para ver la actividad. Pídeselo a quien administra los roles.'
// `docs/UX.md` › «Actividad»: si no se pueden leer los ajustes, la retención de fábrica.
const DIAS_POR_DEFECTO = 14

// Qué cambió, quién y cuándo en los últimos días (`docs/UX.md` › «Actividad»): una página por cursor con «Ver más», filtros de persona y
// entidad en la URL y `?registro=` desde una ficha. Lo que se ve lo decide la base: las dos RPC piden `actividad.ver` y recortan cada fila.
export default function PaginaDeActividad({ searchParams }: PageProps<'/actividad'>) {
  return (
    <Suspense fallback={<EsqueletoListado filas={8} columnas={5} />}>
      <Actividad searchParams={searchParams} />
    </Suspense>
  )
}

async function Actividad({
  searchParams,
}: {
  searchParams: PageProps<'/actividad'>['searchParams']
}) {
  await connection()
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!puede(sesion.permisos, 'actividad.ver')) {
    return <EstadoSinPermiso descripcion={SIN_PERMISO} />
  }
  const [personas, ajustes] = await Promise.all([leerPersonasDeLaActividad(), leerAjustes()])
  const esquema = esquemaDeFiltrosDeActividad({
    personas: datosO(personas),
    entidades: ENTIDADES_DE_LA_ACTIVIDAD,
  })
  const pedido = pedidoDeActividad(
    leerFiltros(esquema, parametros),
    unParametro(parametros[CLAVE_DE_REGISTRO]) ?? null,
  )
  const pagina = await leerPaginaDeActividad(pedido)
  if (!pagina.ok && pagina.error.codigo === 'sin_permiso') {
    return <EstadoSinPermiso descripcion={SIN_PERMISO} />
  }
  const zona = (ajustes.ok ? ajustes.data.ajustes.zonaHoraria : null) ?? ZONA_POR_DEFECTO
  return (
    <ListadoDeActividad
      key={claveDelPedido(pedido)}
      inicial={datosO(pagina)}
      pedido={pedido}
      esquema={esquema}
      hoy={diaEnZona(new Date().toISOString(), { zona })}
      diasDeActividad={ajustes.ok ? ajustes.data.ajustes.actividadDias : DIAS_POR_DEFECTO}
      entidadDelRegistro={
        pedido.tabla !== null && pedido.registro !== null ? etiquetaDeEntidad(pedido.tabla) : null
      }
    />
  )
}
