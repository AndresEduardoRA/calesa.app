import { ArrowLeftIcon } from 'lucide-react'
import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { z } from 'zod'
import { puede, requerirSesion } from '@/modules/equipo'
import { leerFasesDeOrigen } from '@/modules/flujos'
import { getOrigenes, leerLayout } from '@/modules/origenes'
import {
  EsqueletoDeFotos,
  editablesDe,
  eliminablesDe,
  motivoParaNoEnviar,
  leerVehiculo,
  origenesVisibles,
  permisoDePapelera,
  permisoDeVitrina,
  vistaPreviaDe,
} from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import { RUTAS, unParametro } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { vehiculoEnEdicion } from '../edicion'
import { BloqueVinculo } from './bloque-vinculo'
import { Encabezado } from './encabezado'
import { Paneles } from './paneles'
import { CLAVE_DE_PESTANA, hayBarraDePestanas, pestanaDeVehiculo } from './pestanas'
import { PestanasDeVehiculo } from './pestanas-de-vehiculo'
import { SeccionFicha } from './seccion-ficha'
import { SeccionFotos } from './seccion-fotos'

export const metadata: Metadata = { title: 'Vehículo' }

// Lo que no existe, lo que está en la papelera y lo que la persona no ve se muestran igual: decir
// «no tienes permiso» confirmaría que existe.
function NoDisponible() {
  return (
    <EstadoVacio
      titulo="No existe o no tienes acceso"
      descripcion="Puede que se haya eliminado, o que esté en un origen que no ves."
      accion={
        <Link href={RUTAS.vehiculos as Route} className={buttonVariants({ variant: 'outline' })}>
          Ir al inventario
        </Link>
      }
    />
  )
}

// La ficha de un vehículo: su cabecera y, debajo, la pestaña de `?seccion=` (ver `pestanas.ts`;
// las que faltan se suman con su sección cuando existan).
export default async function PaginaVehiculo({
  params,
  searchParams,
}: PageProps<'/vehiculos/[id]'>) {
  const [sesion, { id }, parametros] = await Promise.all([requerirSesion(), params, searchParams])
  if (!z.guid().safeParse(id).success) {
    return <NoDisponible />
  }
  const [vehiculo, origenes] = await Promise.all([leerVehiculo(id), getOrigenes(true)])
  const encontrado = datosO(vehiculo)
  const origen = origenesVisibles(sesion.permisos, datosO(origenes)).find(
    (uno) => uno.id === encontrado?.origenId,
  )
  if (!encontrado || !origen) {
    return <NoDisponible />
  }
  const [layout, fases, enEdicion, editables, previa, eliminables] = await Promise.all([
    leerLayout(origen.id, { conUso: false }),
    leerFasesDeOrigen(origen.id),
    vehiculoEnEdicion(parametros, sesion, origen.id),
    editablesDe(sesion, [encontrado]),
    vistaPreviaDe(encontrado.id),
    eliminablesDe(sesion, [encontrado]),
  ])
  const suLayout = datosO(layout)
  const editable = editables.has(encontrado.id)
  const fase = datosO(fases).find((una) => una.id === encontrado.faseId) ?? null
  const publicar = permisoDeVitrina(sesion.permisos, origen)
  const pestana = pestanaDeVehiculo(unParametro(parametros[CLAVE_DE_PESTANA]))
  return (
    <div className="grid max-w-4xl gap-4">
      <Link
        href={`${RUTAS.vehiculos}?origen=${origen.id}` as Route}
        className="inline-flex min-h-11 w-fit items-center gap-1.5 text-(length:--text-sm) text-(--color-ink-soft) underline-offset-2 hover:text-(--color-ink) hover:underline md:min-h-8"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        {origen.nombre}
      </Link>
      <Encabezado
        vehiculo={encontrado}
        origen={origen}
        fase={fase}
        previa={previa}
        publicar={publicar}
        editable={editable}
        papelera={permisoDePapelera(
          eliminables.has(encontrado.id),
          motivoParaNoEnviar(encontrado, fase),
        )}
      />
      {hayBarraDePestanas() ? <PestanasDeVehiculo /> : null}
      {pestana === 'ficha' ? (
        <>
          <SeccionFicha vehiculo={encontrado} origen={origen} layout={suLayout} />
          {/* A quién pertenece y a quién le interesa: sólo para quien ve leads. */}
          {puede(sesion.permisos, 'leads.ver') ? (
            <Suspense fallback={null}>
              <BloqueVinculo vehiculoId={encontrado.id} />
            </Suspense>
          ) : null}
        </>
      ) : null}
      {pestana === 'fotos' ? (
        // La cabecera y las pestañas ya están: las fotos llegan en su propio hueco.
        <Suspense fallback={<EsqueletoDeFotos />}>
          <SeccionFotos vehiculoId={encontrado.id} puedeEditar={editable} />
        </Suspense>
      ) : null}
      <Paneles
        vehiculo={encontrado}
        origen={origen}
        fase={fase}
        layout={suLayout}
        previa={previa}
        publicar={publicar}
        enEdicion={enEdicion?.id === encontrado.id ? enEdicion : null}
      />
    </div>
  )
}
