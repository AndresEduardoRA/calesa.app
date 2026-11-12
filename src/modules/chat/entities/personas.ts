// Elegir personas para una conversación (7.09-2): el texto de búsqueda y el tope de lo que se muestra. Puro; la lectura está en `infra/personas.client.ts`.
import { cortarAlTope } from '@/shared/lib/conteo'

// Como en Equipo y en la agenda: menos de 3 letras o dígitos no se busca.
export const MINIMO_DE_BUSQUEDA_DE_PERSONAS = 3

// Cuántas personas se muestran por búsqueda; la lectura pide una más para saber si hay otras.
export const TOPE_DE_PERSONAS = 20

export type PersonaEncontrada = { id: string; nombre: string }

export type PersonasEncontradas = { personas: PersonaEncontrada[]; hayMas: boolean }

// El texto que se busca, recortado; nulo si es demasiado corto para pedirlo (se cuentan caracteres, no unidades UTF-16).
export function textoDeBusqueda(texto: string): string | null {
  const recortado = texto.trim()
  return [...recortado].length >= MINIMO_DE_BUSQUEDA_DE_PERSONAS ? recortado : null
}

// Una lectura con `TOPE_DE_PERSONAS + 1` filas, cortada en el tope.
export function cortarPersonas(leidas: readonly PersonaEncontrada[]): PersonasEncontradas {
  const { filas, hayMas } = cortarAlTope(leidas, TOPE_DE_PERSONAS)
  return { personas: filas, hayMas }
}
