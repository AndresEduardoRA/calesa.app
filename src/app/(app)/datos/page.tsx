import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { seccionDeDatos, seccionesDeDatos } from '@/modules/datos'
import { SeccionExportar } from '@/modules/datos/pantallas/datos'
import { puede, requerirSesion } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import type { Permisos } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { SeccionImportarDeDatos } from './importar'
import { PestanasDeDatos } from './pestanas-de-datos'

export const metadata: Metadata = { title: 'Datos' }

type Parametro = string | string[]
type Props = {
  searchParams: Promise<{ seccion?: Parametro; entidad?: Parametro; origen?: Parametro }>
}

// `/datos`: exportar e importar (9.06-4b). Cualquiera con sesión entra: «Mis leads» es de todos; el resto lo arman los permisos.
export default async function PaginaDatos({ searchParams }: Props) {
  // La sesión se lee al pedir la pantalla, no al prepararla.
  await connection()
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  const seccion = seccionDeDatos(unParametro(parametros.seccion), sesion.permisos)
  return (
    <div className="grid gap-5">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Datos</h1>
      <PestanasDeDatos pestanas={seccionesDeDatos(sesion.permisos)} valor={seccion} />
      {seccion === 'exportar' ? (
        <Exportar permisos={sesion.permisos} />
      ) : (
        <Suspense fallback={<EsqueletoFormulario bloques={1} campos={3} />}>
          <SeccionImportarDeDatos
            entidad={unParametro(parametros.entidad)}
            origen={unParametro(parametros.origen)}
          />
        </Suspense>
      )}
    </div>
  )
}

async function Exportar({ permisos }: { permisos: Permisos }) {
  // Los orígenes sólo hacen falta para exportar todo: quien ve sólo «Mis leads» no paga esa lectura.
  const leidos = puede(permisos, 'datos.exportar.todo') ? await getOrigenes(true) : null
  const origenes = leidos?.ok ? leidos.data.map(({ id, nombre }) => ({ id, nombre })) : null
  return <SeccionExportar permisos={permisos} origenes={origenes} />
}
