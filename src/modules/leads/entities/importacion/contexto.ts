// Lo que la importación necesita de los catálogos: el contexto del alta más la CLAVE de cada origen y tipo activo, porque una celda
// del archivo los nombra por nombre o por clave. El alta no las trae (dibuja `<select>`: ver `lead_alta_contexto()`); salen de
// `leads_catalogos()`, que ya las entrega junto con los apagados. Sin I/O.
import type { ClaseDeTipoDeLead } from '../tipo-de-lead'
import type { CatalogosDeLead } from '../catalogos'
import type { ContextoDeAlta } from '../alta'

export type OrigenDeImportacion = { id: string; clave: string; nombre: string }
export type TipoDeImportacion = {
  id: string
  clave: string
  nombre: string
  clase: ClaseDeTipoDeLead
}

export type ContextoDeImportacion = Omit<ContextoDeAlta, 'origenes' | 'tipos'> & {
  origenes: OrigenDeImportacion[]
  tipos: TipoDeImportacion[]
}

// Los orígenes y tipos que el alta ofrece (activos, en su orden), con su clave. Uno que el catálogo ya no tiene (se eliminó entre
// las dos lecturas) no se ofrece: la importación no inventa una clave.
export function contextoDeImportacionDesde(
  contexto: ContextoDeAlta,
  catalogos: CatalogosDeLead,
): ContextoDeImportacion {
  const origenes: OrigenDeImportacion[] = []
  for (const origen of contexto.origenes) {
    const fila = catalogos.origenes.find((c) => c.id === origen.id)
    if (fila) origenes.push({ id: origen.id, clave: fila.clave, nombre: origen.nombre })
  }
  const tipos: TipoDeImportacion[] = []
  for (const tipo of contexto.tipos) {
    const fila = catalogos.tipos.find((c) => c.id === tipo.id)
    if (fila) tipos.push({ id: tipo.id, clave: fila.clave, nombre: tipo.nombre, clase: tipo.clase })
  }
  return { ...contexto, origenes, tipos }
}
