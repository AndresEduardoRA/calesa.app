// Escalas y textos de las gráficas del tablero (9.08-2). Lo que se dibuja es HTML y SVG de servidor; aquí vive lo que se calcula y
// lo que se escribe, para probarlo sin pantalla. Cero I/O.
import { formatearDiaYMes } from '@/shared/lib/fechas'
import { formatearNumero } from '@/shared/lib/formato'

// Cuántos orígenes y personas devuelve la RPC de 9.07 (`tablero_leads`: `n <= 10` por origen, `n <= 20` por asesor;
// `supabase/migrations/20261112110517_tablero_leads.sql`). Si la RPC cambia su tope, cambia aquí.
export const TOPE_DE_ORIGENES = 10
export const TOPE_DE_PERSONAS = 20

// Un contador con su forma en singular y en plural: `['creado', 'creados', 3]`.
export type Contador = readonly [uno: string, varios: string, n: number]

// El menor número redondo (1, 2 o 5 por una potencia de diez) que no queda por debajo del máximo. Nunca 0: no se divide por cero.
export function techoDeEscala(maximo: number): number {
  if (!Number.isFinite(maximo) || maximo <= 1) {
    return 1
  }
  const potencia = 10 ** Math.floor(Math.log10(maximo))
  for (const paso of [1, 2, 5, 10]) {
    if (paso * potencia >= maximo) {
      return paso * potencia
    }
  }
  return 10 * potencia
}

// Qué parte del techo ocupa un valor, siempre entre 0 y 1.
export function fraccion(valor: number, techo: number): number {
  if (!Number.isFinite(valor) || !Number.isFinite(techo) || techo <= 0 || valor <= 0) {
    return 0
  }
  return Math.min(1, valor / techo)
}

// Los índices de los días que llevan fecha escrita bajo el eje: siempre el primero y el último, parejos y sin repetir.
export function marcasDeDias(dias: readonly string[], maximoDeMarcas = 6): readonly number[] {
  const n = dias.length
  if (n === 0) {
    return []
  }
  if (n <= maximoDeMarcas) {
    return dias.map((_, indice) => indice)
  }
  return Array.from({ length: maximoDeMarcas }, (_, i) =>
    Math.round((i * (n - 1)) / (maximoDeMarcas - 1)),
  )
}

function contar([uno, varios, n]: Contador): string {
  return `${formatearNumero(n)} ${n === 1 ? uno : varios}`
}

// «12/11: 3 creados, 1 convertido»: lo que lee quien no ve la barra.
export function textoDeBarra(dia: string, contadores: readonly Contador[]): string {
  return `${formatearDiaYMes(dia)}: ${contadores.map(contar).join(', ')}`
}

// «12 creados · 5 convertidos»: la fila de un ranking.
export function textoDeFila(contadores: readonly Contador[]): string {
  return contadores.map(contar).join(' · ')
}

export function nombreDeOrigen(nombre: string | null): string {
  return nombre ?? 'Sin origen'
}

export function nombreDePersona(nombre: string | null): string {
  return nombre ?? 'Sin nombre'
}

// Cuando la RPC dice que hay más, se avisa cuántos se muestran; nunca un total exacto (`escala.md`).
export function notaDeTope(
  hayMas: boolean,
  tope: number,
  sustantivo: 'origen' | 'persona',
): string | null {
  if (!hayMas) {
    return null
  }
  return sustantivo === 'origen'
    ? `Se muestran los ${tope} primeros orígenes.`
    : `Se muestran las ${tope} primeras personas.`
}
