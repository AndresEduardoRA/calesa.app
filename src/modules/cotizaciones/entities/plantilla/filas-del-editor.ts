// Lo que el editor dibuja de la plantilla (4.19-3b): los grupos en el orden de la plantilla con sus miembros en el orden de la fórmula, el total y lo aparte, y «Buscar
// fila» sobre todo eso. Puro: lo que se muestra sale de la plantilla y del contexto reducido que ya está en el navegador.
import type { Plantilla } from './forma-de-plantilla'
import type { TonoDelCatalogo } from './lectura-de-la-plantilla'
import type { ContextoDePlantilla } from './validar-plantilla'

export type FilaDeNodo = { readonly id: string; readonly etiqueta: string }
export type GrupoDelEditor = {
  readonly id: string
  readonly etiqueta: string
  // El tono elegido en la plantilla (si hay) y el del grupo de la fórmula.
  readonly tono: string | undefined
  readonly tonoDelGrupo: string | undefined
  readonly miembros: readonly FilaDeNodo[]
}
export type FilasDelEditor = {
  readonly grupos: readonly GrupoDelEditor[]
  readonly total: FilaDeNodo | null
  readonly aparte: readonly FilaDeNodo[]
}

export function filasDelEditor(
  plantilla: Plantilla,
  contexto: ContextoDePlantilla,
): FilasDelEditor {
  const nodos = contexto.definicion.nodos ?? []
  const fila = (n: { id: string; etiqueta?: string | null }): FilaDeNodo => ({
    id: n.id,
    etiqueta: n.etiqueta || n.id,
  })
  const deLaFormula = new Map((contexto.definicion.grupos ?? []).map((g) => [g.id, g]))
  const total = nodos.find((n) => n.salida === 'total')
  const aparte = (contexto.diseno?.tarjeta_total?.secundarios ?? []).flatMap((id) => {
    const n = nodos.find((x) => x.id === id)
    return n === undefined || n.id === total?.id ? [] : [fila(n)]
  })
  return {
    grupos: plantilla.grupos.map((g) => {
      const f = deLaFormula.get(g.grupo)
      return {
        id: g.grupo,
        etiqueta: f?.etiqueta || g.grupo,
        tono: g.tono,
        tonoDelGrupo: f?.tono ?? undefined,
        miembros: nodos.filter((n) => n.grupo === g.grupo).map(fila),
      }
    }),
    total: total === undefined ? null : fila(total),
    aparte,
  }
}

// El nombre del catálogo o, si ya no está, la clave con el aviso. Por `Map`: `constructor` no está en ningún catálogo.
export function nombreDelTono(clave: string, tonos: readonly TonoDelCatalogo[]): string {
  return new Map(tonos.map((t) => [t.clave, t.nombre])).get(clave) ?? `${clave} (ya no está)`
}

const normalizar = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

// «Buscar fila»: por la etiqueta escrita, la de la fórmula o el id, sin mayúsculas ni tildes. En blanco, todas. Una fila con motivo de rechazo se queda siempre.
export function filtrarFilas<T extends { id: string; etiqueta: string; escrita?: string }>(
  filas: readonly T[],
  texto: string,
  conMotivo: (id: string) => boolean = () => false,
): T[] {
  const buscado = normalizar(texto.trim())
  if (buscado === '') return [...filas]
  return filas.filter(
    (f) =>
      conMotivo(f.id) ||
      [f.id, f.etiqueta, f.escrita ?? ''].some((campo) => normalizar(campo).includes(buscado)),
  )
}
