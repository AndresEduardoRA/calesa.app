import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { requerirSesion } from '@/modules/equipo'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { seccionesVisibles } from './secciones'

export const metadata: Metadata = { title: 'Configuración' }

// El hub de Configuración: una tarjeta por sección que esta persona puede abrir.
export default async function PaginaConfiguracion() {
  const sesion = await requerirSesion()
  const secciones = seccionesVisibles(sesion.permisos)
  if (secciones.length === 0) {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid max-w-3xl gap-4">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Configuración</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {secciones.map(({ clave, titulo, descripcion, ruta, Icono }) => (
          <li key={clave}>
            <Link
              // Las rutas de las secciones existen: lo garantiza secciones.test.ts contra el disco.
              href={ruta as Route}
              className="flex h-full min-h-20 items-start gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4 outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus)"
            >
              <Icono aria-hidden className="mt-0.5 size-5 shrink-0 text-(--color-ink-soft)" />
              <span className="grid gap-0.5">
                <span className="text-(length:--text-sm) font-medium text-(--color-ink)">
                  {titulo}
                </span>
                <span className="text-(length:--text-sm) text-(--color-ink-soft)">
                  {descripcion}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
