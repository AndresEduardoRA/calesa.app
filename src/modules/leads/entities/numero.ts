import type { Resultado } from '@/shared/lib/errores'
import type { NumerosDeLead } from '@/shared/lib/numeros-de-lead'

// Lo que `leads` decide sobre los números: qué número busca «#124» y qué columnas de un archivo no se importan.
// Cómo se escriben y se leen los números es de `@/shared/lib/numeros-de-lead` (también lo usa `vehiculos`).

// Qué números busca «#124»: con el permiso, el global **y** el propio de cualquier creador (de los leads que la persona ve); sin él, sólo el propio de
// quien busca. Nunca el global de quien no lo tiene: sería un oráculo que revela el número de un lead visible. Lo resuelve la base
// (`leads_ids_del_numero`), que además lo hace cumplir con la policy de las copias.
export function numeroQueSeBusca(puedeVerElGlobal: boolean): 'global_y_propios' | 'propio' {
  return puedeVerElGlobal ? 'global_y_propios' : 'propio'
}

// Una columna de un archivo CSV que parece traer el número de un lead («N.º», «Número», «#», «Tu n.º»).
// Los números los pone el sistema: no se importan ni se pueden fijar desde un archivo.
const ENCABEZADO_DE_NUMERO =
  /^(?:#|n\.?\s?[º°]|no\.|nro\.?|num\.?|número|numero)(?:\s+(?:propio|global))?$|^n\.?\s?[º°]\s+propio\s+de$|^tu\s+n\.?\s?[º°]$/i

export function esEncabezadoDeNumero(encabezado: string): boolean {
  return ENCABEZADO_DE_NUMERO.test(encabezado.trim())
}

// Los ids de los leads con ese número que quien mira ve. `todos`: con el permiso del global, el global y el propio de cualquier creador; si no, el propio
// de quien mira.
export type LectorDeIdsDelNumero = (
  numero: number,
  opciones: { todos: boolean },
) => Promise<Resultado<string[]>>

// Por qué una fila coincide con el número buscado, cuando no lo dice su número principal: la fila muestra el global y lo que se buscó es su propio
// (de otra persona, o de quien mira). Nulo si coincide el principal (el que ya se ve), si no se ve el global (el propio ya es el principal: sin el
// permiso no hay nada que explicar) o si el número no es ninguno de los dos.
export type CoincidenciaDelNumero = { numeroPropio: number; creadorDelPropio: string | null }

export function coincidenciaDelNumero(
  numeros: NumerosDeLead,
  buscado: number | null,
): CoincidenciaDelNumero | null {
  if (buscado === null || numeros.numero === null || numeros.numero === buscado) {
    return null
  }
  if (numeros.numeroPropio !== buscado) {
    return null
  }
  return { numeroPropio: numeros.numeroPropio, creadorDelPropio: numeros.creadorDelPropio }
}
