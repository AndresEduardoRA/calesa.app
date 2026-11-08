// Poner el nivel de ver y de editar de una sección o de una celda, siempre juntos (4.22): la base rechaza `editar_sin_ver` (ver restringido
// con editar ausente o `todos`), así que el editor nunca lo produce. Devuelve un diseño nuevo, sin mutar el original. No mira si el nivel
// existe, está retirado o no admite nivel (el total, lo aparte, la variante): lo dice `validarDiseno()` tras cada cambio.
import { NIVEL_TODOS, type CeldaDeDiseno, type Diseno, type SeccionDeDiseno } from '../diseno'

export type DondeDeNiveles = { seccion: string; nodo?: string }
export type CambioDeNiveles = { ver?: string; editar?: string }

const esRestringido = (nivel: string | undefined): nivel is string =>
  nivel !== undefined && nivel !== NIVEL_TODOS

// Una clave opcional: sin valor, ni existe (la base lee lo mismo omitido que `todos` en una sección).
function con<T extends object>(
  objeto: T,
  clave: 'nivel_ver' | 'nivel_editar',
  valor: string | undefined,
): T {
  const { [clave]: _anterior, ...resto } = objeto as T & Record<string, unknown>
  return (valor === undefined ? resto : { ...resto, [clave]: valor }) as T
}

const sinTodos = (nivel: string | undefined) => (nivel === NIVEL_TODOS ? undefined : nivel)

// Ver restringido con editar abierto → el editar se alinea con el ver.
const alinear = (ver: string | undefined, editar: string | undefined) =>
  esRestringido(ver) && !esRestringido(editar) ? ver : editar

function enSeccion(s: SeccionDeDiseno, cambios: CambioDeNiveles): SeccionDeDiseno {
  const ver = sinTodos(cambios.ver ?? s.nivel_ver)
  const editar = alinear(ver, sinTodos(cambios.editar ?? s.nivel_editar))
  const items = s.items.map((it) =>
    // La celda que hereda el ver restringido y declara su editar «todos» daría `editar_sin_ver`.
    it.tipo === 'celda' &&
    esRestringido(ver) &&
    it.nivel_ver === undefined &&
    it.nivel_editar === NIVEL_TODOS
      ? { ...it, nivel_editar: ver }
      : it,
  )
  return { ...con(con(s, 'nivel_ver', ver), 'nivel_editar', editar), items }
}

function enCelda(c: CeldaDeDiseno, s: SeccionDeDiseno, cambios: CambioDeNiveles): CeldaDeDiseno {
  // «todos» escrito en una celda sólo se omite si la sección no lo tapa (la celda gana a su sección).
  const propio = (nuevo: string | undefined, deSeccion: string | undefined) =>
    nuevo === NIVEL_TODOS && !esRestringido(deSeccion) ? undefined : nuevo
  const ver = propio(cambios.ver ?? c.nivel_ver, s.nivel_ver)
  const editar = propio(cambios.editar ?? c.nivel_editar, s.nivel_editar)
  const efectivoVer = ver ?? s.nivel_ver
  const efectivoEditar = editar ?? s.nivel_editar
  const alineado =
    esRestringido(efectivoVer) && !esRestringido(efectivoEditar) ? efectivoVer : editar
  return con(con(c, 'nivel_ver', ver), 'nivel_editar', alineado)
}

export function ponerNiveles(
  diseno: Diseno,
  donde: DondeDeNiveles,
  cambios: CambioDeNiveles,
): Diseno {
  return {
    ...diseno,
    secciones: diseno.secciones.map((s) => {
      if (s.id !== donde.seccion) return s
      if (donde.nodo === undefined) return enSeccion(s, cambios)
      let tocada = false
      const items = s.items.map((it) => {
        if (tocada || it.tipo !== 'celda' || it.nodo !== donde.nodo) return it
        tocada = true
        return enCelda(it, s, cambios)
      })
      return { ...s, items }
    }),
  }
}
