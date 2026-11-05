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

// La ayuda de una celda es un texto del diseño o una tabla de referencia (`ayuda: {texto}` o `ayuda: {tabla}`): lo que abre su botón lo decide la hoja.
export type TipoDeAyuda = 'texto' | 'tabla'

export const tipoDeAyuda = (celda: CeldaDeHoja): TipoDeAyuda | null =>
  celda.ayuda === null ? null : 'texto' in celda.ayuda ? 'texto' : 'tabla'

// El texto de la ayuda de una celda, o nulo si no tiene o es de una tabla.
export const ayudaDeTexto = (celda: CeldaDeHoja): string | null =>
  celda.ayuda !== null && 'texto' in celda.ayuda ? celda.ayuda.texto : null

// La clave de la tabla de la ayuda de una celda, o nulo si no tiene o es de texto.
export const tablaDeAyuda = (celda: CeldaDeHoja): string | null =>
  celda.ayuda !== null && 'tabla' in celda.ayuda ? celda.ayuda.tabla : null

// El tipo de ayuda de cada celda de estas secciones, por nodo (para que el callback único de las celdas sepa qué abrir sin cambiar).
export const tiposDeAyuda = (secciones: readonly SeccionDeHoja[]): Map<string, TipoDeAyuda> =>
  new Map(
    secciones
      .flatMap((s) => s.items)
      .flatMap((item) => {
        const tipo = item.tipo === 'celda' ? tipoDeAyuda(item) : null
        return item.tipo === 'celda' && tipo !== null ? [[item.nodo, tipo] as const] : []
      }),
  )

// La celda a la que apunta `?nodo=` si se dibuja ahora en estas secciones y su ayuda es de ese tipo; si no (otro nivel, un id inventado, una ayuda de otro tipo, una celda
// apagada), nada: la URL no abre lo que la hoja no muestra.
export const celdaConAyuda = (
  secciones: readonly SeccionDeHoja[],
  nodo: string | null,
  tipo: TipoDeAyuda,
  c: ContextoDeHoja,
): CeldaDeHoja | null =>
  nodo === null
    ? null
    : (celdasQueSeDibujan(secciones, c).find(
        (celda) => celda.nodo === nodo && tipoDeAyuda(celda) === tipo,
      ) ?? null)
