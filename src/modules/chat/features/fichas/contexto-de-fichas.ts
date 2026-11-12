import type { ClaseDeFicha, EstadoDeFicha } from '../../entities/fichas'

// Lo que el hilo le da a cada burbuja para dibujar la ficha de una tarea o de un evento y completarla (7.10-3). `estadoDe`: nulo mientras no se leyó,
// `'error'` si la lectura falló.
export type ContextoDeFichas = {
  estadoDe: (clase: ClaseDeFicha, id: string) => EstadoDeFicha | 'error' | null
  // Repite la lectura de las que fallaron.
  reintentar: () => void
  // Vuelve a leer una (tras un conflicto): trae la versión nueva.
  releer: (clase: ClaseDeFicha, id: string) => void
  // Tras completar o reabrir: pone el estado y la versión que devolvió la base, sin releer.
  marcarCompletada: (id: string, completada: boolean, actualizadoEn: string) => void
}
