// Elegir personas en el formulario de un evento (destinatarios) o de una tarea (responsable), 7.07-2: el texto de búsqueda, el tope de lo que se
// muestra y la forma de lo que devuelve `agenda_quienes_reciben`. Puro; las lecturas están en `infra/personas.client.ts`.
import { z } from 'zod'
import { cortarAlTope } from '@/shared/lib/conteo'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { PersonaElegida } from './edicion'

// Como en Equipo: menos de 3 letras o dígitos no se busca (`agenda_quienes_reciben` también lo ignora).
export const MINIMO_DE_BUSQUEDA_DE_PERSONAS = 3

// Cuántas personas se muestran por búsqueda (como `agenda_quienes_reciben`); la lectura pide una más para saber si hay otras.
export const TOPE_DE_PERSONAS = 20

export type PersonasEncontradas = { personas: PersonaElegida[]; hayMas: boolean }

// El texto que se busca, recortado; nulo si es demasiado corto para pedirlo.
export function textoDeBusqueda(texto: string): string | null {
  const recortado = texto.trim()
  return [...recortado].length >= MINIMO_DE_BUSQUEDA_DE_PERSONAS ? recortado : null
}

// Una lectura con `TOPE_DE_PERSONAS + 1` filas, cortada en el tope.
export function cortarPersonas(leidas: readonly PersonaElegida[]): PersonasEncontradas {
  const { filas, hayMas } = cortarAlTope(leidas, TOPE_DE_PERSONAS)
  return { personas: filas, hayMas }
}

const esquemaDeQuienesReciben = z.object({
  personas: z.array(z.object({ id: z.guid(), nombre: z.string() })),
  hay_mas: z.boolean(),
})

// De lo que devuelve `agenda_quienes_reciben` (un `jsonb` sin tipo) a lo que dibuja el selector.
export function personasDeQuienesReciben(datos: unknown): Resultado<PersonasEncontradas> {
  const leido = esquemaDeQuienesReciben.safeParse(datos)
  if (!leido.success) {
    return fallo('inesperado', 'No pudimos leer a quién se le puede dar la tarea.')
  }
  return ok({ personas: leido.data.personas, hayMas: leido.data.hay_mas })
}
