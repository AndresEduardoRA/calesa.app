import type { Metadata } from 'next'
import { connection } from 'next/server'
import { seccionDeDatos } from '@/modules/datos'
import { SeccionExportar } from '@/modules/datos/pantallas/datos'
import { puede, requerirSesion } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import { unParametro } from '@/shared/lib/rutas'

export const metadata: Metadata = { title: 'Datos' }

type Props = { searchParams: Promise<{ seccion?: string | string[] }> }

// `/datos`: exportar (y, desde el 9.06, importar). Cualquiera con sesión entra: «Mis leads» es de todos; el resto lo arman los permisos.
export default async function PaginaDatos({ searchParams }: Props) {
  // La sesión se lee al pedir la pantalla, no al prepararla.
  await connection()
  const [sesion, { seccion }] = await Promise.all([requerirSesion(), searchParams])
  // Los orígenes sólo hacen falta para exportar todo: quien ve sólo «Mis leads» no paga esa lectura.
  const leidos = puede(sesion.permisos, 'datos.exportar.todo') ? await getOrigenes(true) : null
  const origenes = leidos?.ok ? leidos.data.map(({ id, nombre }) => ({ id, nombre })) : null
  return (
    <div className="grid gap-5">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Datos</h1>
      {seccionDeDatos(unParametro(seccion)) === 'exportar' ? (
        <SeccionExportar permisos={sesion.permisos} origenes={origenes} />
      ) : null}
    </div>
  )
}
