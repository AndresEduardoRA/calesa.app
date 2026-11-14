import { ArrowLeftIcon } from 'lucide-react'
import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { z } from 'zod'
import { rutaDeActividadDe } from '@/modules/actividad'
import { RegistrarVisita } from '@/modules/buscador/pantallas/visita'
import { puede, requerirSesion, type Permisos } from '@/modules/equipo'
import { leerFasesDeOrigen } from '@/modules/flujos'
import { getOrigenes, leerLayout } from '@/modules/origenes'
import {
  editablesDe,
  eliminablesDe,
  leerVehiculo,
  origenesVisibles,
  permisoDeVitrina,
  vistaPreviaDe,
} from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import { RUTAS, unParametro } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { vehiculoEnEdicion } from '../edicion'
import { AvisoLimpieza } from './aviso-limpieza'
import { papeleraYAvisosDe } from './avisos-de-la-ficha'
import { ContenidoDeLaPestana } from './contenido-de-la-pestana'
import { Encabezado } from './encabezado'
import { Paneles } from './paneles'
import {
  CLAVE_DE_PESTANA,
  hayBarraDePestanas,
  pestanaDeVehiculo,
  pestanasDeQuienMira,
} from './pestanas'
import { PestanasDeVehiculo } from './pestanas-de-vehiculo'
import { RegistrarVisto } from '@/modules/equipo/client'

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

// «Ver actividad» del «⋯», sólo con `actividad.ver` (`vehiculos` no conoce `actividad`: la ruta la arma la página).
function paraActividadDe(permisos: Permisos, vehiculoId: string): string | null {
  return puede(permisos, 'actividad.ver') ? rutaDeActividadDe('vehiculos', vehiculoId) : null
}

// Vuelve al inventario del origen del vehículo.
function VolverAlOrigen({ origen }: { origen: { id: string; nombre: string } }) {
  return (
    <Link
      href={`${RUTAS.vehiculos}?origen=${origen.id}` as Route}
      className="inline-flex min-h-11 w-fit items-center gap-1.5 text-(length:--text-sm) text-(--color-ink-soft) underline-offset-2 hover:text-(--color-ink) hover:underline md:min-h-8"
    >
      <ArrowLeftIcon aria-hidden className="size-4" />
      {origen.nombre}
    </Link>
  )
}

// El vehículo y su origen, si quien mira ve los dos.
async function vehiculoYOrigen(id: string, permisos: Permisos) {
  const [vehiculo, origenes] = await Promise.all([leerVehiculo(id), getOrigenes(true)])
  const encontrado = datosO(vehiculo)
  const origen = origenesVisibles(permisos, datosO(origenes)).find(
    (uno) => uno.id === encontrado?.origenId,
  )
  return { encontrado, origen }
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
  const { encontrado, origen } = await vehiculoYOrigen(id, sesion.permisos)
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
  const { papelera, avisos, ofrecerPapelera } = await papeleraYAvisosDe({
    sesion,
    vehiculo: encontrado,
    origenId: origen.id,
    fase,
    editable,
    eliminable: eliminables.has(encontrado.id),
  })
  const publicar = permisoDeVitrina(sesion.permisos, origen)
  const pestanas = pestanasDeQuienMira(sesion.permisos, origen.id)
  const pestana = pestanaDeVehiculo(unParametro(parametros[CLAVE_DE_PESTANA]), pestanas)
  return (
    <div className="grid max-w-4xl gap-4">
      <RegistrarVisita tipo="vehiculo" id={encontrado.id} />
      <RegistrarVisto modulo="vehiculos" tipo="vehiculo" id={encontrado.id} />
      <VolverAlOrigen origen={origen} />
      <Encabezado
        vehiculo={encontrado}
        origen={origen}
        fase={fase}
        previa={previa}
        publicar={publicar}
        editable={editable}
        verEnLogistica={puede(sesion.permisos, 'logistica.ver', origen.id)}
        paraActividad={paraActividadDe(sesion.permisos, encontrado.id)}
        papelera={papelera}
        avisos={avisos}
      />
      {origen.tipo === 'subasta' ? (
        <Suspense fallback={null}>
          <AvisoLimpieza vehiculo={encontrado} editable={editable} />
        </Suspense>
      ) : null}
      {hayBarraDePestanas(pestanas) ? <PestanasDeVehiculo pestanas={pestanas} /> : null}
      <ContenidoDeLaPestana
        pestana={pestana}
        vehiculo={encontrado}
        origen={origen}
        layout={suLayout}
        editable={editable}
        verLeads={puede(sesion.permisos, 'leads.ver')}
        ofrecerPapelera={ofrecerPapelera}
        avisos={avisos}
      />
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
