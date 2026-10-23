// El espejo TS de `validar_formula()` (docs/COTIZADOR.md › «Las reglas»): primero la forma (el Zod de
// `nodos.ts` y `formula.ts`), después las reglas que cruzan nodos, en pasadas lineales y en un orden fijo.
// Devuelve el primer rechazo, como el `raise` de la base. Los casos de cada regla están en `casos-de-formula.json`.
import type { z } from 'zod'
import { esquemaFormula, type Formula, type Params } from './formula'
import { buscar, esta, recorrer, type Medidor } from './medidor'
import {
  condicionDe,
  esMonto,
  formatoDe,
  referenciasDe,
  sobrescribibleDe,
  soloEnDe,
  type Nodo,
  type Referencia,
} from './nodos'
import { esFallo, fallo, indexar, nodoDe, type Contexto, type Fallo } from './validar-contexto'
import { revisarCambioYGrupos } from './validar-grupos'
import { revisarVariante } from './validar-variante'

export type ResultadoDeValidacion = { ok: true; formula: Formula } | Fallo

export function validarFormula(
  definicion: unknown,
  params: unknown,
  medidor?: Medidor,
): ResultadoDeValidacion {
  const m = medidor ?? { visitas: 0 }
  const leida = esquemaFormula.safeParse({ definicion, params })
  if (!leida.success) return fallo('forma', datosDeForma(leida.error, definicion))
  const formula = leida.data
  const ctx = indexar(formula.definicion, m)
  if (esFallo(ctx)) return ctx
  const rechazo =
    revisarReferencias(ctx) ??
    revisarTotal(ctx) ??
    revisarParams(ctx, formula.params) ??
    revisarPares(ctx) ??
    revisarCambioYGrupos(ctx) ??
    revisarVariante(ctx)
  return rechazo ?? { ok: true, formula }
}

// --- forma -----------------------------------------------------------------------------------------

// `donde` es el id del nodo o del grupo donde está el error (la base lo sabe dar), o la clave de params.
function datosDeForma(error: z.ZodError, definicion: unknown) {
  const ruta = error.issues[0]?.path ?? []
  const [raiz, lista, i] = ruta
  const campo = ruta.map(String).join('.')
  if (raiz === 'params' && typeof lista === 'string') return { campo, donde: lista }
  if (raiz === 'definicion' && (lista === 'nodos' || lista === 'grupos') && typeof i === 'number') {
    const donde = idCrudo(definicion, lista, i)
    return donde === undefined ? { campo } : { campo, donde }
  }
  return { campo }
}

function idCrudo(definicion: unknown, lista: string, i: number): string | undefined {
  const elementos = campoDe(definicion, lista)
  const elemento: unknown = Array.isArray(elementos) ? elementos[i] : undefined
  const id = campoDe(elemento, 'id')
  return typeof id === 'string' ? id : undefined
}

const campoDe = (x: unknown, clave: string): unknown =>
  typeof x === 'object' && x !== null ? (x as Record<string, unknown>)[clave] : undefined

// --- referencias: existen, van hacia atrás y nombran el tipo que corresponde ------------------------

function revisarReferencias(ctx: Contexto): Fallo | undefined {
  let i = 0
  for (const n of recorrer(ctx.nodos, ctx.m)) {
    for (const ref of recorrer(referenciasDe(n), ctx.m)) {
      const r = revisarReferencia(ctx, n, i, ref)
      if (r !== undefined) return r
    }
    i += 1
  }
  return undefined
}

function revisarReferencia(ctx: Contexto, n: Nodo, i: number, ref: Referencia): Fallo | undefined {
  const j = buscar(ctx.pos, ref.id, ctx.m)
  if (j === undefined) {
    // Un `match` que no nombra un nodo nombra un campo del vehículo.
    if (ref.papel === 'match') return undefined
    return fallo('referencia_inexistente', { donde: n.id, ref: ref.id })
  }
  if (j === i) return fallo('ciclo', { donde: n.id })
  if (j > i) return fallo('referencia_hacia_adelante', { donde: n.id, ref: ref.id })
  return revisarTipoDeReferencia(n, ref, ctx.nodos[j])
}

function revisarTipoDeReferencia(
  n: Nodo,
  ref: Referencia,
  destino: Nodo | undefined,
): Fallo | undefined {
  if (destino === undefined) return undefined
  const datos = { donde: n.id, ref: ref.id, campo: ref.papel }
  if ((ref.papel === 'condicion' || ref.papel === 'requerido_si') && destino.tipo !== 'bandera') {
    return fallo('referencia_de_tipo', { ...datos, esperado: 'una bandera' })
  }
  if (destino.tipo === 'opcion' && ref.papel !== 'match') {
    return fallo('referencia_de_tipo', {
      ...datos,
      esperado: 'un número (la variante se nombra en «solo_en» o en un «match»)',
    })
  }
  return undefined
}

// --- el total y params ------------------------------------------------------------------------------

function revisarTotal(ctx: Contexto): Fallo | undefined {
  if (ctx.totales !== 1) return fallo('total_unico', { n: ctx.totales })
  const t = ctx.total
  if (
    t !== undefined &&
    (soloEnDe(t) !== undefined || condicionDe(t) !== undefined || sobrescribibleDe(t))
  ) {
    return fallo('total_fijo', { donde: t.id })
  }
  return undefined
}

function revisarParams(ctx: Contexto, params: Params): Fallo | undefined {
  const constantes = new Set<string>()
  for (const n of recorrer(ctx.nodos, ctx.m)) {
    if (n.tipo !== 'constante') continue
    constantes.add(n.id)
    if (!Object.hasOwn(params.constantes, n.id))
      return fallo('constante_sin_valor', { donde: n.id })
  }
  for (const clave of recorrer(Object.keys(params.constantes), ctx.m)) {
    if (!esta(constantes, clave, ctx.m)) return fallo('param_sin_constante', { donde: clave })
  }
  return undefined
}

// --- el par porcentaje-monto (decisión d) -----------------------------------------------------------

// Quién lee cada nodo: el primero y, si hay, otro distinto. Lineal en aristas.
type Lectores = Map<string, { primero: string; otro?: string }>

function lectoresDe(ctx: Contexto): Lectores {
  const lectores: Lectores = new Map()
  for (const n of recorrer(ctx.nodos, ctx.m)) {
    for (const ref of recorrer(referenciasDe(n), ctx.m)) {
      const ya = buscar(lectores, ref.id, ctx.m)
      if (ya === undefined) lectores.set(ref.id, { primero: n.id })
      else if (ya.primero !== n.id) ya.otro ??= n.id
    }
  }
  return lectores
}

function otroLector(lectores: Lectores, id: string, yo: string, ctx: Contexto): string | undefined {
  const l = buscar(lectores, id, ctx.m)
  if (l === undefined) return undefined
  return l.primero === yo ? l.otro : l.primero
}

function revisarPares(ctx: Contexto): Fallo | undefined {
  const lectores = lectoresDe(ctx)
  for (const n of recorrer(ctx.nodos, ctx.m)) {
    if (n.tipo !== 'calculo' || n.op !== 'porcentaje_de') continue
    const pct = nodoDe(ctx, n.pct)
    if (!esMonto(n) || (pct !== undefined && formatoDe(pct) !== 'pct')) {
      return fallo('par_mal_tipado', { donde: n.id, ref: n.pct })
    }
    const otro = n.sobrescribible === true ? otroLector(lectores, n.pct, n.id, ctx) : undefined
    if (otro !== undefined) return fallo('pct_compartido', { donde: n.id, ref: n.pct, otro })
  }
  return undefined
}
