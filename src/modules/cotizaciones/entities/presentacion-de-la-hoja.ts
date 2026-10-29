import { itemSeDibuja, propsDeCelda, type ContextoDeHoja } from './binding'
import type { CeldaDeHoja, SeccionDeHoja } from './hoja'

// Lo que la hoja dibuja en cada lugar (paso 4.13-4a, `docs/COTIZADOR.md` › «El diseño de la hoja (D7)»): las secciones `principal` en su orden, y las `avanzado` juntas detrás de **un**
// botón «Avanzado» que va donde estaba la primera de ellas. Puro: la hoja recibe sólo las secciones que se dibujan (`seccionSeDibuja`).
export type LugarDeLaHoja =
  { tipo: 'seccion'; seccion: SeccionDeHoja } | { tipo: 'avanzado'; secciones: SeccionDeHoja[] }

export function ordenDeLaHoja(secciones: readonly SeccionDeHoja[]): LugarDeLaHoja[] {
  const avanzadas = secciones.filter((s) => s.presentacion === 'avanzado')
  const lugares: LugarDeLaHoja[] = []
  let puesto = false
  for (const seccion of secciones) {
    if (seccion.presentacion !== 'avanzado') {
      lugares.push({ tipo: 'seccion', seccion })
    } else if (!puesto) {
      puesto = true
      lugares.push({ tipo: 'avanzado', secciones: avanzadas })
    }
  }
  return lugares
}

// Lo que dice el botón «Avanzado» de lo que esconde: los títulos de sus secciones, en su orden (sin título, nada).
export const titulosDeAvanzado = (secciones: readonly SeccionDeHoja[]): string =>
  secciones
    .map((s) => s.titulo)
    .filter((titulo): titulo is string => titulo !== null)
    .join(' · ')

// Las celdas que se dibujan de una sección (lo que apaga un interruptor no cuenta).
const celdasQueSeDibujan = (secciones: readonly SeccionDeHoja[], c: ContextoDeHoja) =>
  secciones.flatMap((s) =>
    s.items.filter((item): item is CeldaDeHoja => item.tipo === 'celda' && itemSeDibuja(item, c)),
  )

// El botón «Avanzado» dice con texto si alguna celda de lo que esconde tiene un aviso (un dato que falta, fuera de rango): lo de adentro no se ve y un error escondido no se puede ignorar.
export const hayDatosPorRevisar = (
  secciones: readonly SeccionDeHoja[],
  c: ContextoDeHoja,
): boolean => celdasQueSeDibujan(secciones, c).some((celda) => propsDeCelda(celda, c).error)

// El texto de la ayuda de una celda, o nulo si no tiene o es de una tabla (la ayuda de tabla es del 4.13-4c: sin botón, para no dibujar uno muerto).
export const ayudaDeTexto = (celda: CeldaDeHoja): string | null =>
  celda.ayuda !== null && 'texto' in celda.ayuda ? celda.ayuda.texto : null

// La celda a la que apunta `?nodo=` si se dibuja ahora en estas secciones y tiene ayuda de texto; si no (otro nivel, un id inventado, una tabla, una celda apagada), nada:
// la URL no abre lo que la hoja no muestra.
export const celdaConAyudaDeTexto = (
  secciones: readonly SeccionDeHoja[],
  nodo: string | null,
  c: ContextoDeHoja,
): CeldaDeHoja | null =>
  nodo === null
    ? null
    : (celdasQueSeDibujan(secciones, c).find(
        (celda) => celda.nodo === nodo && ayudaDeTexto(celda) !== null,
      ) ?? null)
