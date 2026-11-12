import type { Metadata } from 'next'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import { ActualizarTablero } from '@/modules/web/pantallas/cola'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { TableroDeLaCola } from './tablero-de-la-cola'

export const metadata: Metadata = { title: 'Cola web' }

// Configuración › Cola web (8.04-2): quién recibe los turnos de la web y las solicitudes que quedaron sin asesor. Entra quien tiene `web.cola.gestionar`;
// sin la clave, «No tienes permiso». Las lecturas y las escrituras de la base vuelven a exigir la clave. `?panel=agregar-a-la-rueda&q=` abre «Agregar a la
// rueda» y busca en el equipo (8.04-3).
export default async function PaginaDeColaWeb({
  searchParams,
}: PageProps<'/configuracion/cola-web'>) {
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!puede(sesion.permisos, 'web.cola.gestionar')) {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid max-w-3xl gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Cola web</h1>
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            Quién recibe los turnos de la web y las solicitudes que quedaron sin asesor.
          </p>
        </div>
        <ActualizarTablero />
      </div>
      <Suspense fallback={<EsqueletoListado filas={6} columnas={3} />}>
        <TableroDeLaCola
          permisos={sesion.permisos}
          panel={unParametro(parametros['panel'])}
          busqueda={unParametro(parametros['q'])}
        />
      </Suspense>
    </div>
  )
}
