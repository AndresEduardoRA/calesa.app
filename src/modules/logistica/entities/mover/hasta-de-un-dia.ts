// El borde de «Ir a una fecha»: «ese día y lo anterior» es el instante EXCLUSIVO del inicio del día siguiente en la zona de la empresa. Nulo si `dia` no es un `YYYY-MM-DD` que exista.
// Las tres líneas son las de `hastaDeUnDia()` de `cotizaciones`, que una área de logística no puede importar (subirlas a `shared/lib` sería otro paso).
import { diaSiguiente, inicioDelDia } from '@/shared/lib/fechas'

export function hastaDeUnDia(dia: string, zona: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || Number.isNaN(Date.parse(`${dia}T00:00:00Z`))) {
    return null
  }
  return inicioDelDia(diaSiguiente(dia), { zona })
}
