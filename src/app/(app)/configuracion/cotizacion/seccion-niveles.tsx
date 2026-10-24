import { leerNivelesDeAcceso } from '@/modules/cotizaciones'
import { NivelesDeAcceso } from '@/modules/cotizaciones/pantallas/configuracion'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Niveles de acceso»: todos, también los retirados, con el tope que dice la base. Son a lo sumo los que ella dice (10), así que no se
// pagina. `puedeGestionar` (equipo.roles.gestionar) la pone la página: sin él se lee y no se cambia.
export async function SeccionNiveles({ puedeGestionar }: { puedeGestionar: boolean }) {
  return (
    <NivelesDeAcceso lista={datosO(await leerNivelesDeAcceso())} puedeGestionar={puedeGestionar} />
  )
}
