import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import { leerCatalogosDeRepuestos } from '@/modules/repuestos'
import {
  PROYECTO_YA_NO_ESTA,
  cuentasDeLaHoja,
  estadoDelProyecto,
  leerItemsDelProyecto,
  leerProyecto,
} from '@/modules/repuestos'
import { HojaDeItems } from '@/modules/repuestos/pantallas/items'
import { CabeceraDeProyecto } from '@/modules/repuestos/pantallas/proyectos'
import { leerMonedasYTiposCambio } from '@/modules/empresa'
import { leerVehiculo } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { pestanasLlenas } from './pestanas'
import { PestanasDelProyecto } from './pestanas-del-proyecto'

export const metadata: Metadata = { title: 'Proyecto de repuestos' }

// Un proyecto de repuestos (`docs/UX.md` › «Repuestos»): su cabecera y la hoja de ítems. Lo que no existe, está eliminado o quien mira no ve se dicen igual (D49), con un enlace al listado.
export default function PaginaDeUnProyecto({ params }: PageProps<'/repuestos/[id]'>) {
  return (
    <Suspense fallback={<EsqueletoListado filas={6} columnas={6} />}>
      <Proyecto params={params} />
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

async function Proyecto({ params }: { params: PageProps<'/repuestos/[id]'>['params'] }) {
  await connection()
  const [sesion, { id }] = await Promise.all([requerirSesion(), params])
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
  const llenas = pestanasLlenas()
  return (
    <CabeceraDeProyecto
      proyecto={proyecto}
      tituloDelVehiculo={vehiculo?.titulo ?? null}
      estado={estado}
      puedeEditar={puedeEditar}
      sinItems={hoja.filas.length === 0}
    >
      {llenas.length > 1 ? <PestanasDelProyecto pestanas={llenas} /> : null}
      <HojaDeItems
        proyectoId={proyecto.id}
        filas={hoja.filas}
        hayMas={hoja.hayMas}
        catalogos={catalogos}
        monedas={monedas.monedas.filter((m) => m.activa)}
        puedeEditar={puedeEditar}
        cerrado={proyecto.cerradoEn !== null}
      />
    </CabeceraDeProyecto>
  )
}
