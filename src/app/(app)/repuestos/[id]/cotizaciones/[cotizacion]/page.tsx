import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import { leerCotizacion, leerProyecto } from '@/modules/repuestos'
import { HojaDeLectura } from '@/modules/repuestos/pantallas/cotizador-cotizacion'
import { datosO } from '@/shared/lib/errores'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { EsqueletoListado } from '@/shared/ui/esqueletos'

export const metadata: Metadata = { title: 'Cotización de repuestos' }

// Una cotización de repuestos (8.12-3, C12): la hoja en sólo lectura. Pide `repuestos.ver` y `repuestos.cotizar` (D30); la autoridad es la RLS. Una cotización
// que no existe, que es de otro proyecto o que quien mira no ve, y un proyecto que no está, se dicen igual. Sin `loading.tsx` propio (D40).
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
  return (
    <HojaDeLectura
      cotizacion={leida.cotizacion}
      lineas={leida.lineas}
      proyecto={{ id: proyecto.id, numero: proyecto.numero }}
    />
  )
}
