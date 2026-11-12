import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import {
  MAXIMO_DE_PAGINA_DE_REPUESTOS,
  esquemaDelListado,
  estadoDelListadoDe,
  leerCursorDeProyectos,
  leerProyectosDelListado,
  pedidoDelListado,
} from '@/modules/repuestos'
import { ListadoDeProyectos } from '@/modules/repuestos/pantallas/proyectos'
import { datosO } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR, CLAVE_DE_POR_PAGINA, leerFiltros } from '@/shared/lib/filtros'
import { leerPorPagina, tamanoDePagina, tamanosHasta } from '@/shared/lib/paginacion'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoListado } from '@/shared/ui/esqueletos'

export const metadata: Metadata = { title: 'Repuestos' }

// Los proyectos de repuestos (`docs/UX.md` › «Repuestos»): una página por cursor `numero` con sus filtros en la URL. Lo que se ve lo decide la base (`repuestos_proyectos_listar()`
// devuelve vacío sin `repuestos.ver`); acá sólo se arma el pedido y se dibuja. Cada fila trae las cuentas de sus ítems: no hay una lectura por proyecto.
export default function PaginaDeRepuestos({ searchParams }: PageProps<'/repuestos'>) {
  return (
    <Suspense fallback={<EsqueletoListado filas={8} columnas={6} />}>
      <Listado searchParams={searchParams} />
    </Suspense>
  )
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
  const pagina = datosO(await leerProyectosDelListado(pedido))
  const estado = estadoDelListadoDe(filtros)
  return (
    <ListadoDeProyectos
      pagina={pagina}
      esquema={esquema}
      estado={estado}
      porPagina={{ valor: tamano, opciones: tamanosHasta(MAXIMO_DE_PAGINA_DE_REPUESTOS) }}
      nuevo={null}
    />
  )
}
