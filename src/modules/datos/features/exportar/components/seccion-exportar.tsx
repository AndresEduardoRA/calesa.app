import type { Route } from 'next'
import { PANEL_EXPORTAR } from '@/modules/leads'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import type { Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { EXPORTACIONES_POR_HORA } from '../../../entities/descarga'
import { tarjetasDeExportar, type OrigenDeLaTarjeta } from '../../../entities/tarjetas'
import { TarjetaDeEntidad } from './tarjeta-de-entidad'
import { TarjetaMisLeads } from './tarjeta-mis-leads'

type Props = {
  permisos: Permisos
  // Los orígenes de la base (sólo se leen con `datos.exportar.todo`); `null` si no se pudieron leer.
  origenes: OrigenDeLaTarjeta[] | null
}

// La sección «Exportar» de `/datos`: «Mis leads» para todos y, con `datos.exportar.todo`, una tarjeta por entidad. Sólo decide qué se
// dibuja: el permiso, el cupo por hora y lo que se ve los vuelve a exigir la base al exportar.
export function SeccionExportar({ permisos, origenes }: Props) {
  const { misLeads, todo } = tarjetasDeExportar(permisos, origenes)
  return (
    <div className="grid gap-6">
      <TarjetaMisLeads
        tarjeta={misLeads}
        href={`${RUTAS.leads}?${CLAVE_DE_PANEL}=${PANEL_EXPORTAR}` as Route}
      />
      {todo ? (
        <section aria-labelledby="datos-todo" className="grid gap-3">
          <h2 id="datos-todo" className="text-(length:--text-lg) font-semibold text-(--color-ink)">
            Todo
          </h2>
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            Lo que ves con tu sesión: de lo ajeno, el teléfono enmascarado y sin lo privado. Hasta{' '}
            {EXPORTACIONES_POR_HORA} descargas por hora de cada tipo.
          </p>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]">
            <li className="min-w-0">
              <TarjetaDeEntidad entidad="leads" titulo="Leads" tarjeta={todo.leads} />
            </li>
            <li className="min-w-0">
              <TarjetaDeEntidad entidad="vehiculos" titulo="Vehículos" tarjeta={todo.vehiculos} />
            </li>
            <li className="min-w-0">
              <TarjetaDeEntidad
                entidad="cotizaciones"
                titulo="Cotizaciones"
                tarjeta={todo.cotizaciones}
              />
            </li>
          </ul>
        </section>
      ) : null}
    </div>
  )
}
