// §1 de `validarDiseno()`: los modos de tipo de cambio de la cabecera. Un modo es otro `buckets` y otro `total_en`: nombra nodos
// `tipo_cambio`, llena exactamente los buckets de la fórmula y sólo existe donde la fórmula ya divide el total en Bs.
import type { Diseno, ModoDeTipoDeCambio } from './diseno'
import { buscar, esta, propia, recorrer } from './medidor'
import { fallo, type FalloDeDiseno } from './motivos-de-diseno'
import type { Indice } from './validar-diseno-contexto'

export function revisarModos(ix: Indice, d: Diseno): FalloDeDiseno | undefined {
  const claves = new Set<string>()
  for (const modo of recorrer(d.cabecera.modos, ix.m)) {
    if (esta(claves, modo.clave, ix.m)) return fallo('modo_duplicado', { donde: modo.clave })
    claves.add(modo.clave)
    const r = revisarModo(ix, modo)
    if (r !== undefined) return r
  }
  return undefined
}

const esTipoDeCambio = (ix: Indice, id: string) =>
  buscar(ix.nodos, id, ix.m)?.tipo === 'tipo_cambio'

function revisarModo(ix: Indice, modo: ModoDeTipoDeCambio): FalloDeDiseno | undefined {
  const donde = modo.clave
  if (ix.def.total_en === undefined) return fallo('modo_sin_total_en', { donde })
  const buckets = ix.def.buckets ?? {}
  const llenos = new Set<string>()
  for (const e of recorrer(modo.buckets, ix.m)) {
    if (propia(buckets, e.bucket, ix.m) === undefined) {
      return fallo('modo_bucket_inexistente', { donde, ref: e.bucket })
    }
    if (esta(llenos, e.bucket, ix.m)) return fallo('modo_bucket_repetido', { donde, ref: e.bucket })
    llenos.add(e.bucket)
    if (!esTipoDeCambio(ix, e.nodo)) {
      return fallo('modo_tipo_de_cambio_inexistente', { donde, ref: e.nodo })
    }
  }
  if (!esTipoDeCambio(ix, modo.total_en)) {
    return fallo('modo_tipo_de_cambio_inexistente', { donde, ref: modo.total_en })
  }
  // Cada bucket del modo existe en la fórmula y no se repite: llena todos si tiene tantos como ella.
  if (llenos.size < ix.nBuckets) return fallo('modo_incompleto', { donde })
  return undefined
}
