import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import {
  MAXIMO_DE_PAGINA_DE_REPUESTOS,
  CLAVE_DE_VEHICULO,
  CLAVE_DE_VISTA_DE_LA_CADENA,
  CLAVE_DE_VISTA_DE_REPUESTOS,
  PANEL_NUEVO_PROYECTO,
  esVistaDeLaCadena,
  esVistaDeStock,
  esquemaDelListado,
  estadoDelListadoDe,
  leerCursorDeProyectos,
  leerProyectosDelListado,
  pedidoDelListado,
} from '@/modules/repuestos'
import { BotonNuevoProyecto, ListadoDeProyectos } from '@/modules/repuestos/pantallas/proyectos'
import { leerVehiculo } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import {
  CLAVE_DE_CURSOR,
  CLAVE_DE_PANEL,
  CLAVE_DE_POR_PAGINA,
  leerFiltros,
} from '@/shared/lib/filtros'
import { leerPorPagina, tamanoDePagina, tamanosHasta } from '@/shared/lib/paginacion'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { z } from 'zod'
import { ListadoDeLaCadena } from './listado-de-la-cadena'
import { ListadoDeStock } from './listado-de-stock'
import { NuevoProyecto, type VehiculoDeLaUrl } from './nuevo-proyecto'
import { VistasDeRepuestos } from './vistas-de-repuestos'

export const metadata: Metadata = { title: 'Repuestos' }

// Los proyectos de repuestos (`docs/UX.md` › «Repuestos»): una página por cursor `numero` con sus filtros en la URL; con `?vista=cadena`, la cadena de ítems por fase (8.13-3); con `?vista=stock`, lo que está en stock (8.10-3). Lo que se ve lo decide la base (`repuestos_proyectos_listar()`
// devuelve vacío sin `repuestos.ver`); acá sólo se arma el pedido y se dibuja. Cada fila trae las cuentas de sus ítems: no hay una lectura por proyecto.
export default function PaginaDeRepuestos({ searchParams }: PageProps<'/repuestos'>) {
  return (
    <Suspense fallback={<EsqueletoListado filas={8} columnas={6} />}>
      <Listado searchParams={searchParams} />
    </Suspense>
  )
}

// El `?vehiculo=` con que se abre «Nuevo proyecto»: sólo se lee con el panel abierto y con `repuestos.editar`; el título sale bajo la RLS de quien mira (nulo si no existe o no se ve).
async function vehiculoDeLaUrl(
  parametros: Record<string, string | string[] | undefined>,
): Promise<VehiculoDeLaUrl | null> {
  const id = unParametro(parametros[CLAVE_DE_VEHICULO])
  if (
    unParametro(parametros[CLAVE_DE_PANEL]) !== PANEL_NUEVO_PROYECTO ||
    !z.guid().safeParse(id).success
  ) {
    return null
  }
  const vehiculo = datosO(await leerVehiculo(id ?? ''))
  return { id: id ?? '', titulo: vehiculo?.titulo ?? null }
}

async function Listado({
  searchParams,
}: {
  searchParams: PageProps<'/repuestos'>['searchParams']
}) {
  await connection()
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!puede(sesion.permisos, 'repuestos.ver')) {
    return <EstadoSinPermiso />
  }
  // La vista «Cadena» (`?vista=cadena`, 8.13-3): los ítems por fase del flujo de repuestos; con `?item=` abre el panel del ítem.
  if (esVistaDeLaCadena(unParametro(parametros[CLAVE_DE_VISTA_DE_LA_CADENA]))) {
    return (
      <div className="grid gap-4">
        <VistasDeRepuestos vista="cadena" />
        <ListadoDeLaCadena parametros={parametros} permisos={sesion.permisos} />
      </div>
    )
  }
  // La vista «Stock» (`?vista=stock`, 8.10-3) no lee proyectos ni ofrece «Nuevo proyecto».
  if (esVistaDeStock(unParametro(parametros[CLAVE_DE_VISTA_DE_REPUESTOS]))) {
    return (
      <div className="grid gap-4">
        <VistasDeRepuestos vista="stock" />
        <ListadoDeStock
          parametros={parametros}
          puedeEditar={puede(sesion.permisos, 'repuestos.editar')}
        />
      </div>
    )
  }
  const esquema = esquemaDelListado()
  const tamano = tamanoDePagina({
    pedido: leerPorPagina(unParametro(parametros[CLAVE_DE_POR_PAGINA])),
    preferencia: sesion.preferencias.porPagina,
    maximo: MAXIMO_DE_PAGINA_DE_REPUESTOS,
  })
  const filtros = leerFiltros(esquema, parametros)
  const pedido = pedidoDelListado(filtros, {
    cursor: leerCursorDeProyectos(unParametro(parametros[CLAVE_DE_CURSOR])),
    tamano,
  })
  const puedeEditar = puede(sesion.permisos, 'repuestos.editar')
  const [pagina, delVehiculo] = await Promise.all([
    leerProyectosDelListado(pedido).then(datosO),
    puedeEditar ? vehiculoDeLaUrl(parametros) : Promise.resolve(null),
  ])
  const estado = estadoDelListadoDe(filtros)
  return (
    <div className="grid gap-4">
      <VistasDeRepuestos vista="proyectos" />
      <ListadoDeProyectos
        pagina={pagina}
        esquema={esquema}
        estado={estado}
        porPagina={{ valor: tamano, opciones: tamanosHasta(MAXIMO_DE_PAGINA_DE_REPUESTOS) }}
        nuevo={puedeEditar ? <BotonNuevoProyecto /> : null}
      />
      <NuevoProyecto
        puedeEditar={puedeEditar}
        puedeVerLeads={puede(sesion.permisos, 'leads.ver')}
        vehiculoDeLaUrl={delVehiculo}
      />
    </div>
  )
}
