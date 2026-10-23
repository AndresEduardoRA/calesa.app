// Las reglas de la variante (decisión e de docs/DECISIONES.md, paso 4.05): a lo sumo un nodo `opcion`, sus
// claves sin repetir, y `solo_en` después de él y con claves que existen.
import { esta, recorrer } from './medidor'
import { soloEnDe, type NodoOpcion } from './nodos'
import { esFallo, fallo, type Contexto, type Fallo } from './validar-contexto'

type Variante = { nodo: NodoOpcion; pos: number; claves: ReadonlySet<string> }

export function revisarVariante(ctx: Contexto): Fallo | undefined {
  const v = laVariante(ctx)
  return esFallo(v) ? v : revisarSoloEn(ctx, v.variante)
}

function laVariante(ctx: Contexto): { variante: Variante | undefined } | Fallo {
  let variante: Variante | undefined
  let i = -1
  for (const n of recorrer(ctx.nodos, ctx.m)) {
    i += 1
    if (n.tipo !== 'opcion') continue
    if (variante !== undefined)
      return fallo('opcion_repetida', { donde: n.id, otro: variante.nodo.id })
    const claves = clavesDe(ctx, n)
    if (esFallo(claves)) return claves
    variante = { nodo: n, pos: i, claves }
  }
  return { variante }
}

function clavesDe(ctx: Contexto, n: NodoOpcion): Set<string> | Fallo {
  const claves = new Set<string>()
  for (const o of recorrer(n.opciones, ctx.m)) {
    if (esta(claves, o.clave, ctx.m))
      return fallo('opcion_clave_repetida', { donde: n.id, clave: o.clave })
    claves.add(o.clave)
  }
  if (n.por_defecto !== undefined && !esta(claves, n.por_defecto, ctx.m)) {
    return fallo('opcion_por_defecto_inexistente', { donde: n.id, clave: n.por_defecto })
  }
  return claves
}

// `solo_en` lee la variante: va después de ella, como toda referencia, y nombra opciones que tiene.
function revisarSoloEn(ctx: Contexto, variante: Variante | undefined): Fallo | undefined {
  let i = -1
  for (const n of recorrer(ctx.nodos, ctx.m)) {
    i += 1
    const soloEn = soloEnDe(n)
    if (soloEn === undefined) continue
    if (variante === undefined) return fallo('solo_en_sin_opcion', { donde: n.id })
    if (variante.pos > i)
      return fallo('referencia_hacia_adelante', { donde: n.id, ref: variante.nodo.id })
    for (const clave of recorrer(soloEn, ctx.m)) {
      if (!esta(variante.claves, clave, ctx.m))
        return fallo('solo_en_opcion_inexistente', { donde: n.id, clave })
    }
  }
  return undefined
}
