import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import { itemAbiertoDe, leerCatalogosDeRepuestos } from '@/modules/repuestos'
import {
  PROYECTO_YA_NO_ESTA,
  cuentasDeLaHoja,
  estadoDelProyecto,
  leerItemsDelProyecto,
  leerProyecto,
} from '@/modules/repuestos'
import { DrawerDelItem } from '@/modules/repuestos/pantallas/flujo'
import { CabeceraDeProyecto } from '@/modules/repuestos/pantallas/proyectos'
import { leerMonedasYTiposCambio } from '@/modules/empresa'
import { leerVehiculo } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { RUTAS, unParametro } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { ItemAbierto } from '../item-abierto'
import { HojaConStock } from './hoja-con-stock'
import { pestanaDe, pestanasLlenas } from './pestanas'
import { PestanasDelProyecto } from './pestanas-del-proyecto'
import { SeccionDeCompras } from './seccion-compras'

export const metadata: Metadata = { title: 'Proyecto de repuestos' }

// Un proyecto de repuestos (`docs/UX.md` › «Repuestos»): su cabecera y la hoja de ítems o, con `repuestos.costos.ver` y `?pestana=compras`, sus compras y el margen. Lo que no existe, está eliminado o quien mira no ve se dicen igual (D49), con un enlace al listado.
export default function PaginaDeUnProyecto({ params, searchParams }: PageProps<'/repuestos/[id]'>) {
  return (
    <Suspense fallback={<EsqueletoListado filas={6} columnas={6} />}>
      <Proyecto params={params} searchParams={searchParams} />
    </Suspense>
  )
}

function NoDisponible() {
  return (
    <EstadoVacio
      titulo={PROYECTO_YA_NO_ESTA}
      accion={
        <Link href={RUTAS.repuestos} className={buttonVariants({ variant: 'outline' })}>
          Volver a Repuestos
        </Link>
      }
    />
  )
}

// El panel del ítem de `?item=<id>` (8.13-2): sólo en la hoja, y sólo sin `?panel=`. Una URL con el id de otro proyecto abre igual (se lee por id, bajo la RLS).
function PanelDelItem({ itemId, permisos }: { itemId: string | null; permisos: Permisos }) {
  if (itemId === null) return null
  return (
    <DrawerDelItem>
      <Suspense fallback={<EsqueletoListado filas={4} columnas={2} />}>
        <ItemAbierto id={itemId} permisos={permisos} />
      </Suspense>
    </DrawerDelItem>
  )
}

async function Proyecto({
  params,
  searchParams,
}: Pick<PageProps<'/repuestos/[id]'>, 'params' | 'searchParams'>) {
  await connection()
  const [sesion, { id }, parametros] = await Promise.all([requerirSesion(), params, searchParams])
  if (!puede(sesion.permisos, 'repuestos.ver')) {
    return <EstadoSinPermiso />
  }
  const proyecto = datosO(await leerProyecto(id))
  if (proyecto === null) {
    return <NoDisponible />
  }
  // Las lecturas que fallan suben al `error.tsx` (con «Reintentar»); el vehículo que quien mira no ve queda en nulo.
  const [hoja, catalogos, monedas, vehiculo] = await Promise.all([
    leerItemsDelProyecto(proyecto.id).then(datosO),
    leerCatalogosDeRepuestos().then(datosO),
    leerMonedasYTiposCambio().then(datosO),
    proyecto.vehiculoId === null
      ? Promise.resolve(null)
      : leerVehiculo(proyecto.vehiculoId).then(datosO),
  ])
  const puedeEditar = puede(sesion.permisos, 'repuestos.editar')
  const estado = estadoDelProyecto({
    cerradoEn: proyecto.cerradoEn,
    ...cuentasDeLaHoja(hoja.filas),
  })
  // Sin `repuestos.costos.ver` la pestaña «Compras» no está y `?pestana=compras` abre «Ítems»: no se lee ninguna compra ni el margen.
  const llenas = pestanasLlenas(sesion.permisos)
  const abierta = pestanaDe(unParametro(parametros['pestana']), llenas)
  return (
    <CabeceraDeProyecto
      proyecto={proyecto}
      tituloDelVehiculo={vehiculo?.titulo ?? null}
      estado={estado}
      puedeEditar={puedeEditar}
      sinItems={hoja.filas.length === 0}
    >
      {llenas.length > 1 ? <PestanasDelProyecto pestanas={llenas} /> : null}
      {abierta === 'compras' ? (
        <Suspense fallback={<EsqueletoListado filas={4} columnas={4} />}>
          <SeccionDeCompras
            proyectoId={proyecto.id}
            items={hoja.filas.map((f) => ({ id: f.id, descripcion: f.descripcion }))}
            monedas={monedas.monedas.filter((m) => m.activa)}
            puedeEditarCostos={puede(sesion.permisos, 'repuestos.costos.editar')}
            cerrado={proyecto.cerradoEn !== null}
          />
        </Suspense>
      ) : (
        <>
          <HojaConStock
            proyectoId={proyecto.id}
            filas={hoja.filas}
            hayMas={hoja.hayMas}
            catalogos={catalogos}
            monedas={monedas.monedas.filter((m) => m.activa)}
            puedeEditar={puedeEditar}
            cerrado={proyecto.cerradoEn !== null}
          />
          <PanelDelItem itemId={itemAbiertoDe(parametros)} permisos={sesion.permisos} />
        </>
      )}
    </CabeceraDeProyecto>
  )
}
