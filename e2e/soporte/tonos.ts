// Lo que limpian los e2e del catálogo de tonos (4.22-4): los tonos que crea la prueba (su nombre empieza con «Tono e2e») salen por SQL, por si el recorrido se corta antes
// de eliminarlos con la pantalla. Los tres de fábrica no se tocan.
import { sql } from './sql'

export const PREFIJO_DE_TONO_DE_PRUEBA = 'Tono e2e'

export function borrarTonosDePrueba(): void {
  sql(`delete from public.tonos where nombre like '${PREFIJO_DE_TONO_DE_PRUEBA}%'`)
}
