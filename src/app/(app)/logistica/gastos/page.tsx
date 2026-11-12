import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import {
  CLAVE_DE_VISTA,
  esquemaDeFiltrosDeDinero,
  leerCategoriasDeGasto,
  leerGastosDelListado,
  leerPagosDelListado,
  pedidoDeDinero,
  vistaDe,
  vistasPermitidas,
  type VistaDeDinero,
} from '@/modules/logistica'
import { ListadoDeDinero } from '@/modules/logistica/pantallas/dinero'
import { getOrigenes } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR, leerFiltros } from '@/shared/lib/filtros'
import { leerCursor } from '@/shared/lib/paginacion'
import type { Permisos } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoDetalle, EsqueletoListado } from '@/shared/ui/esqueletos'
import { CLAVE_DE_UNIDAD } from '../clave-de-unidad'
import { DrawerDeLaUnidad } from '../drawer-de-la-unidad'
import { UnidadAbierta } from '../unidad-abierta'

export const metadata: Metadata = { title: 'Gastos' }

// Los gastos y los pagos que quien mira puede ver (`docs/UX.md` › «Logística»): `?ver=gastos|pagos`, una página por cursor `(fecha, id)` con sus filtros en la URL. Lo que se ve lo
// decide la base (`gastos_listar()` y `pagos_listar()` son invocadoras y salen vacías sin la clave del origen); acá sólo se arma el pedido y se dibuja. La fila abre el panel de su unidad
// (`?vehiculo=`), el mismo de `/logistica`. Ninguna suma: lo que se muestra es la fila.
export default function PaginaDeGastosDeLogistica({
  searchParams,
}: PageProps<'/logistica/gastos'>) {
  return (
    <Suspense fallback={<EsqueletoListado filas={8} columnas={5} />}>
      <Listado searchParams={searchParams} />
    </Suspense>
  )
}

const CLAVE_DE_VER: Record<VistaDeDinero, 'logistica.gastos.ver' | 'logistica.pagos.ver'> = {
  gastos: 'logistica.gastos.ver',
  pagos: 'logistica.pagos.ver',
}

// Los orígenes donde la persona ve esa vista (también los desactivados: sus gastos siguen ahí).
async function origenesDeLaVista(permisos: Permisos, vista: VistaDeDinero) {
  const todos = datosO(await getOrigenes(true))
  return todos.filter((origen) => puede(permisos, CLAVE_DE_VER[vista], origen.id))
}

async function Listado({
  searchParams,
}: {
  searchParams: PageProps<'/logistica/gastos'>['searchParams']
}) {
  await connection()
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  const { permisos } = sesion
  const vista = puede(permisos, 'logistica.ver')
    ? vistaDe(unParametro(parametros[CLAVE_DE_VISTA]), permisos)
    : null
  if (vista === null) {
    return <EstadoSinPermiso />
  }
  const [origenes, categorias] = await Promise.all([
    origenesDeLaVista(permisos, vista),
    vista === 'gastos' ? leerCategoriasDeGasto().then(datosO) : Promise.resolve([]),
  ])
  const esquema = esquemaDeFiltrosDeDinero(vista, { origenes, categorias })
  const pedido = pedidoDeDinero(vista, leerFiltros(esquema, parametros), {
    cursor: leerCursor(unParametro(parametros[CLAVE_DE_CURSOR])),
  })
  const lista =
    vista === 'gastos'
      ? ({ vista, pagina: datosO(await leerGastosDelListado(pedido)) } as const)
      : ({ vista, pagina: datosO(await leerPagosDelListado(pedido)) } as const)
  const unidad = unParametro(parametros[CLAVE_DE_UNIDAD])
  return (
    <>
      <ListadoDeDinero
        lista={lista}
        vistas={vistasPermitidas(permisos)}
        esquema={esquema}
        claveDeUnidad={CLAVE_DE_UNIDAD}
      />
      {unidad ? (
        <DrawerDeLaUnidad>
          <Suspense key={unidad} fallback={<EsqueletoDetalle />}>
            <UnidadAbierta id={unidad} permisos={permisos} />
          </Suspense>
        </DrawerDeLaUnidad>
      ) : null}
    </>
  )
}
