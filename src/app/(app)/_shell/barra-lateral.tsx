import type { Permisos } from '@/shared/lib/permisos'
import { EnlaceNav } from './enlace-nav'
import { entradasVisibles } from './navegacion'

// La navegación principal, filtrada por los permisos de quien entra. Se dibuja igual en la barra
// de escritorio y dentro del menú de móvil.
export function BarraLateral({ permisos }: { permisos: Permisos }) {
  const entradas = entradasVisibles(permisos, 'principal')

  return (
    <nav aria-label="Principal">
      <ul className="grid gap-0.5">
        {entradas.map(({ clave, ruta, titulo, Icono }) => (
          <li key={clave}>
            <EnlaceNav ruta={ruta}>
              <Icono aria-hidden />
              {titulo}
            </EnlaceNav>
          </li>
        ))}
      </ul>
    </nav>
  )
}
