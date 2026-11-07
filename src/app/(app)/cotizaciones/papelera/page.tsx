import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import {
  leerPapeleraDeCotizaciones,
  puedeAbrirLaPapeleraDeCotizaciones,
  puedePurgarLaPapeleraDeCotizaciones,
} from '@/modules/cotizaciones'
import { PapeleraDeCotizaciones } from '@/modules/cotizaciones/pantallas/papelera'
import { requerirSesion } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import { puedeAbrirLaPapelera } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { LOTES_POR_PAGINA, leerCursor } from '@/shared/lib/paginacion'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoBandeja } from '@/shared/ui/esqueletos'

export const metadata: Metadata = { title: 'Papelera de cotizaciones' }

// La papelera de cotizaciones, por lote. La abre quien envía cotizaciones a la papelera (ve lo suyo) o quien puede vaciarla (ve todo): qué lotes le tocan lo decide
// la base. Muestra número, título, clase, origen y fecha de cada cotización, nunca su total ni su cliente.
export default function PaginaPapeleraDeCotizaciones({
  searchParams,
}: PageProps<'/cotizaciones/papelera'>) {
  return (
    <Suspense fallback={<EsqueletoBandeja bloques={3} />}>
      <Papelera searchParams={searchParams} />
    </Suspense>
  )
}

async function Papelera({
  searchParams,
}: {
  searchParams: PageProps<'/cotizaciones/papelera'>['searchParams']
}) {
  await connection()
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!puedeAbrirLaPapeleraDeCotizaciones(sesion.permisos)) {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para enviar cotizaciones a la papelera ni para vaciarla. Pídeselo a quien administra los roles." />
    )
  }
  const [pagina, origenes] = await Promise.all([
    leerPapeleraDeCotizaciones({
      cursor: leerCursor(unParametro(parametros[CLAVE_DE_CURSOR] ?? undefined)),
      tamano: LOTES_POR_PAGINA,
    }),
    // También los desactivados: sus cotizaciones siguen ahí.
    getOrigenes(true),
  ])
  return (
    <PapeleraDeCotizaciones
      pagina={datosO(pagina)}
      puedePurgar={puedePurgarLaPapeleraDeCotizaciones(sesion.permisos)}
      origenes={datosO(origenes).map((origen) => ({ id: origen.id, nombre: origen.nombre }))}
      // Contra este instante se cuentan los días que faltan: el mismo en el servidor y al hidratar.
      ahora={new Date().toISOString()}
      // El enlace a la otra papelera lo compone esta página: `cotizaciones` no importa `vehiculos`.
      papeleraDeVehiculos={puedeAbrirLaPapelera(sesion.permisos)}
    />
  )
}
