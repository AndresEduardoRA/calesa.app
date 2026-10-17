import type { Resultado } from '@/shared/lib/errores'

// Lo que `leads` decide sobre los números: qué número busca «#124» y qué columnas de un archivo no se importan.
// Cómo se escriben y se leen los números es de `@/shared/lib/numeros-de-lead` (también lo usa `vehiculos`).

// Qué número se busca con «#124»: el que la persona ve primero. Con el permiso, el global; sin él, el propio.
// Nunca el global de quien no lo tiene: sería un oráculo que revela el número de un lead visible.
export function numeroQueSeBusca(puedeVerElGlobal: boolean): 'global' | 'propio' {
  return puedeVerElGlobal ? 'global' : 'propio'
}

// Una columna de un archivo CSV que parece traer el número de un lead («N.º», «Número», «#», «Tu n.º»).
// Los números los pone el sistema: no se importan ni se pueden fijar desde un archivo.
const ENCABEZADO_DE_NUMERO =
  /^(?:#|n\.?\s?[º°]|no\.|nro\.?|num\.?|número|numero)(?:\s+(?:propio|global))?$|^tu\s+n\.?\s?[º°]$/i

export function esEncabezadoDeNumero(encabezado: string): boolean {
  return ENCABEZADO_DE_NUMERO.test(encabezado.trim())
}

// Los ids de los leads con ese número que quien mira ve. `global`: el de toda la empresa (con el permiso); si no, el propio.
export type LectorDeIdsDelNumero = (
  numero: number,
  opciones: { global: boolean },
) => Promise<Resultado<string[]>>
