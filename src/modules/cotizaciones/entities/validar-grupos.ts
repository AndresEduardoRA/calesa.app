// Las reglas de los tipos de cambio, los buckets y los grupos (decisiones a y b de docs/DECISIONES.md, paso 4.05).
import type { Grupo } from './formula'
import { buscar, esta, recorrer } from './medidor'
import { bucketDe, esMonto, type Nodo } from './nodos'
import { fallo, nodoDe, type Contexto, type Fallo } from './validar-contexto'

export function revisarCambioYGrupos(ctx: Contexto): Fallo | undefined {
  const grupos = ctx.def.grupos ?? []
  return (
    revisarTiposDeCambio(ctx) ??
    (grupos.length > 0 ? revisarGrupos(ctx, grupos) : revisarSinGrupos(ctx))
  )
}

const esTipoDeCambio = (ctx: Contexto, id: string) => nodoDe(ctx, id)?.tipo === 'tipo_cambio'
const hayBucket = (ctx: Contexto, b: string) => Object.hasOwn(ctx.def.buckets ?? {}, b)

// Una clave de tipo de cambio, un solo nodo; `buckets` y `total_en` nombran nodos `tipo_cambio`.
function revisarTiposDeCambio(ctx: Contexto): Fallo | undefined {
  const porClave = new Map<string, string>()
  for (const n of recorrer(ctx.nodos, ctx.m)) {
    if (n.tipo !== 'tipo_cambio') continue
    const otro = buscar(porClave, n.clave, ctx.m)
    if (otro !== undefined)
      return fallo('tipo_de_cambio_repetido', { donde: n.id, otro, clave: n.clave })
    porClave.set(n.clave, n.id)
  }
  for (const [bucket, id] of recorrer(Object.entries(ctx.def.buckets ?? {}), ctx.m)) {
    if (!esTipoDeCambio(ctx, id))
      return fallo('tipo_de_cambio_inexistente', { donde: `buckets.${bucket}`, ref: id })
  }
  const totalEn = ctx.def.total_en
  if (totalEn !== undefined && !esTipoDeCambio(ctx, totalEn)) {
    return fallo('tipo_de_cambio_inexistente', { donde: 'total_en', ref: totalEn })
  }
  return undefined
}

// --- la forma de la Fase 0: sin grupos, el bucket va en el nodo y el total se reparte ---------------

function revisarSinGrupos(ctx: Contexto): Fallo | undefined {
  for (const n of recorrer(ctx.nodos, ctx.m)) {
    const b = bucketDe(n)
    if (b !== undefined && !hayBucket(ctx, b))
      return fallo('bucket_inexistente', { donde: n.id, bucket: b })
  }
  const t = ctx.total
  if (t === undefined || sePuedeRepartir(ctx, t)) return undefined
  return fallo('total_sin_tipo_de_cambio', { donde: t.id })
}

// El total tiene bucket, o es una suma y cada término directo tiene el suyo.
function sePuedeRepartir(ctx: Contexto, t: Nodo): boolean {
  if (bucketDe(t) !== undefined) return true
  if (t.tipo !== 'calculo' || t.op !== 'suma') return false
  for (const id of recorrer(t.de, ctx.m)) {
    const termino = nodoDe(ctx, id)
    if (termino === undefined || bucketDe(termino) === undefined) return false
  }
  return true
}

// --- con grupos -------------------------------------------------------------------------------------

function revisarGrupos(ctx: Contexto, grupos: readonly Grupo[]): Fallo | undefined {
  if (ctx.def.total_en === undefined) return fallo('grupos_sin_total_en')
  const miembros = new Map<string, number>()
  for (const g of recorrer(grupos, ctx.m)) {
    if (buscar(miembros, g.id, ctx.m) !== undefined)
      return fallo('grupo_duplicado', { donde: g.id })
    miembros.set(g.id, 0)
    if (!hayBucket(ctx, g.bucket))
      return fallo('bucket_inexistente', { donde: g.id, bucket: g.bucket })
  }
  const r = revisarMiembros(ctx, miembros) ?? revisarDobleConteo(ctx)
  if (r !== undefined) return r
  for (const [id, cuantos] of recorrer(miembros, ctx.m)) {
    if (cuantos === 0) return fallo('grupo_vacio', { donde: id })
  }
  return undefined
}

function revisarMiembros(ctx: Contexto, miembros: Map<string, number>): Fallo | undefined {
  for (const n of recorrer(ctx.nodos, ctx.m)) {
    const b = bucketDe(n)
    if (b !== undefined) return fallo('bucket_con_grupos', { donde: n.id, bucket: b })
    if (n.grupo === undefined) continue
    const cuantos = buscar(miembros, n.grupo, ctx.m)
    if (cuantos === undefined) return fallo('grupo_inexistente', { donde: n.id, grupo: n.grupo })
    miembros.set(n.grupo, cuantos + 1)
    if (!esMonto(n)) return fallo('miembro_no_es_monto', { donde: n.id, grupo: n.grupo })
    if (n.salida !== undefined) return fallo('miembro_con_salida', { donde: n.id, grupo: n.grupo })
  }
  return undefined
}

// Doble conteo: una pasada hacia adelante marca lo que acumula un miembro (el miembro, un cálculo que
// no es `porcentaje_de` y lee algo marcado, un `sugerido_de` de algo marcado). Un miembro sólo puede leer
// lo marcado como base de un `porcentaje_de`: fees = 13 % del remate pasa; un `suma` del remate, no.
function revisarDobleConteo(ctx: Contexto): Fallo | undefined {
  const marcados = new Set<string>()
  for (const n of recorrer(ctx.nodos, ctx.m)) {
    const leido = marcadoQueAcumula(ctx, n, marcados)
    if (n.grupo !== undefined && leido !== undefined) {
      return fallo('doble_conteo', { donde: n.id, grupo: n.grupo, ref: leido })
    }
    if (n.grupo !== undefined || leido !== undefined) marcados.add(n.id)
  }
  return undefined
}

function marcadoQueAcumula(
  ctx: Contexto,
  n: Nodo,
  marcados: ReadonlySet<string>,
): string | undefined {
  const acumula =
    n.tipo === 'calculo' && n.op !== 'porcentaje_de'
      ? n.de
      : n.tipo === 'input' && n.sugerido_de !== undefined
        ? [n.sugerido_de]
        : []
  for (const id of recorrer(acumula, ctx.m)) {
    if (esta(marcados, id, ctx.m)) return id
  }
  return undefined
}
