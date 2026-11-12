import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import {
  leerCotizacion,
  leerItemsDelProyecto,
  leerProyecto,
  type CotizacionConLineas,
  type ItemParaCotizar,
} from '@/modules/repuestos'
import { HojaDeLectura, HojaEditable } from '@/modules/repuestos/pantallas/cotizador-cotizacion'
import { datosO } from '@/shared/lib/errores'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { EsqueletoListado } from '@/shared/ui/esqueletos'

export const metadata: Metadata = { title: 'Cotización de repuestos' }

// Una cotización de repuestos (8.12-3, C12; 8.12-4, C9). Pide `repuestos.ver` y `repuestos.cotizar` (D30); la autoridad es la RLS. Una cotización que no
// existe, que es de otro proyecto o que quien mira no ve, y un proyecto que no está, se dicen igual. Sin `loading.tsx` propio (D40). Una borrador con el
// proyecto abierto y el snapshot válido es la hoja editable (D41: la base rechaza lo mismo); si no, la de lectura.
export default function PaginaDeUnaCotizacion({
  params,
}: PageProps<'/repuestos/[id]/cotizaciones/[cotizacion]'>) {
  return (
    <Suspense fallback={<EsqueletoListado filas={6} columnas={6} />}>
      <Cotizacion params={params} />
    </Suspense>
  )
}

function NoDisponible({ volverA }: { volverA: { href: string; texto: string } }) {
  return (
    <EstadoVacio
      titulo="Esta cotización ya no está."
      accion={
        <Link href={volverA.href as Route} className={buttonVariants({ variant: 'outline' })}>
          {volverA.texto}
        </Link>
      }
    />
  )
}

async function Cotizacion({
  params,
}: Pick<PageProps<'/repuestos/[id]/cotizaciones/[cotizacion]'>, 'params'>) {
  await connection()
  const [sesion, { id, cotizacion }] = await Promise.all([requerirSesion(), params])
  if (!puede(sesion.permisos, 'repuestos.ver') || !puede(sesion.permisos, 'repuestos.cotizar')) {
    return <EstadoSinPermiso />
  }
  const [proyecto, leida] = await Promise.all([
    leerProyecto(id).then(datosO),
    leerCotizacion(id, cotizacion).then(datosO),
  ])
  if (proyecto === null) {
    return <NoDisponible volverA={{ href: RUTAS.repuestos, texto: 'Volver a Repuestos' }} />
  }
  if (leida === null) {
    return (
      <NoDisponible
        volverA={{
          href: `${RUTAS.repuestos}/${proyecto.id}?pestana=cotizaciones`,
          texto: 'Volver al proyecto',
        }}
      />
    )
  }
  const datos = { id: proyecto.id, numero: proyecto.numero }
  const { cotizacion: c } = leida
  if (c.estado === 'borrador' && proyecto.cerradoEn === null && c.snapshot.ok) {
    return (
      <HojaEditable
        key={c.actualizadoEn}
        cotizacion={c}
        snapshot={c.snapshot.snapshot}
        lineas={leida.lineas}
        proyecto={datos}
        items={await itemsParaCotizar(proyecto.id)}
      />
    )
  }
  return (
    <HojaDeLectura {...leida} proyecto={datos} nota={notaDeLectura(leida, proyecto.cerradoEn)} />
  )
}

// Los ítems del proyecto para «Agregar desde un ítem» (D49): el área `cotizador` no importa `items`, así que los lee la página (tope 200, `armarHoja`).
async function itemsParaCotizar(proyectoId: string): Promise<ItemParaCotizar[]> {
  const hoja = datosO(await leerItemsDelProyecto(proyectoId))
  return hoja.filas.map((f) => ({ id: f.id, descripcion: f.descripcion, cantidad: f.cantidad }))
}

function notaDeLectura({ cotizacion }: CotizacionConLineas, cerradoEn: string | null) {
  return cotizacion.estado === 'borrador' && cerradoEn !== null
    ? 'El proyecto está cerrado: reábrelo para cotizar.'
    : undefined
}
