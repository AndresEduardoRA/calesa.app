import type { Metadata } from 'next'
import { connection } from 'next/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { requerirSesion } from '@/modules/equipo'
import { filtroDeLista, leerPaginaDeNotificaciones } from '@/modules/notificaciones'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { RUTAS, unParametro } from '@/shared/lib/rutas'
import { EsqueletoDeNotificaciones } from './esqueleto-de-notificaciones'
import { RUTAS_CON_PANTALLA } from '../_shell/rutas-con-pantalla'
import { ListaConAcciones } from './lista-con-acciones'

export const metadata: Metadata = { title: 'Notificaciones' }

async function Avisos({
  parametros,
}: {
  parametros: PageProps<'/notificaciones'>['searchParams']
}) {
  await connection()
  const [sesion, pedidos] = await Promise.all([requerirSesion(), parametros])
  const ver = filtroDeLista(unParametro(pedidos['ver']))
  const inicial = await leerPaginaDeNotificaciones({ ver, tamano: TAMANO_DE_VER_MAS })
  return (
    <ListaConAcciones
      ver={ver}
      usuarioId={sesion.usuarioId}
      inicial={inicial}
      disponibles={RUTAS_CON_PANTALLA}
    />
  )
}

// Todos los avisos de quien mira, de a `TAMANO_DE_VER_MAS` por cursor. Cualquiera con sesión la ve: la RLS deja a cada
// quien sólo los suyos. `?ver=por-accionar|todas` vive en la URL; un valor ilegible es `todas`.
export default function PaginaDeNotificaciones({ searchParams }: PageProps<'/notificaciones'>) {
  return (
    <div className="grid max-w-2xl gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Notificaciones</h1>
        <Link
          href={`${RUTAS.perfil}#notificaciones`}
          className="text-(length:--text-sm) text-(--color-ink-faint) underline underline-offset-2 hover:text-(--color-ink)"
        >
          Preferencias de avisos
        </Link>
      </div>
      <Suspense fallback={<EsqueletoDeNotificaciones />}>
        <Avisos parametros={searchParams} />
      </Suspense>
    </div>
  )
}
