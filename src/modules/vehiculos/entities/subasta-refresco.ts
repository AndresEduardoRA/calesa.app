// Refrescar: qué se actualiza al volver a consultar y qué se conserva porque la persona lo editó.
import type { ColumnasDeSubasta, DatosDeSubasta, ValorDeAtributo } from './subasta'

export type DatosActuales = {
  columnas: ColumnasDeSubasta
  atributos: Record<string, unknown>
}

export type Refresco = {
  // Lo que se escribe: sólo lo que cambió y que la persona no había tocado.
  columnas: ColumnasDeSubasta
  atributos: Record<string, ValorDeAtributo>
  // Las claves que la persona editó y se conservaron, para decirlo.
  conservados: string[]
}

function iguales(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((valor, indice) => valor === b[indice])
  }
  return a === b
}

// Tres vías: lo que dijo la API la vez anterior (`previo`), lo que dice ahora (`nuevo`) y lo que
// hay guardado (`actual`). Si lo guardado sigue siendo lo que la API había dicho, la persona no lo
// tocó y toma el valor nuevo; si difiere, lo editó y se conserva. Un dato que la API ya no trae no
// borra nada. No hace falta una columna que recuerde quién editó qué: el bruto anterior es el testigo.
type Decision = 'escribir' | 'conservar' | 'nada'

// Qué hacer con un dato: nada si la API no dice algo distinto de lo guardado, o de lo que ya
// había dicho (no hay nada nuevo que escribir ni nada que conservar); escribirlo si la persona
// no lo tocó (o no tenía nada); conservarlo si lo editó.
function decidir(nuevo: unknown, actual: unknown, previo: unknown): Decision {
  if (iguales(nuevo, actual) || iguales(nuevo, previo)) {
    return 'nada'
  }
  return actual === undefined || iguales(actual, previo) ? 'escribir' : 'conservar'
}

export function fusionarRefresco(
  previo: DatosDeSubasta,
  nuevo: DatosDeSubasta,
  actual: DatosActuales,
): Refresco {
  const refresco: Refresco = { columnas: {}, atributos: {}, conservados: [] }

  for (const clave of Object.keys(nuevo.columnas) as (keyof ColumnasDeSubasta)[]) {
    const valor = nuevo.columnas[clave]
    const decision = decidir(valor, actual.columnas[clave], previo.columnas[clave])
    if (decision === 'escribir') {
      Object.assign(refresco.columnas, { [clave]: valor })
    } else if (decision === 'conservar') {
      refresco.conservados.push(clave)
    }
  }

  for (const [clave, valor] of Object.entries(nuevo.atributos)) {
    const decision = decidir(valor, actual.atributos[clave], previo.atributos[clave])
    if (decision === 'escribir') {
      refresco.atributos[clave] = valor
    } else if (decision === 'conservar') {
      refresco.conservados.push(clave)
    }
  }
  return refresco
}

export type EtiquetasConocidas = {
  // Las columnas (por su nombre en la base) y los campos del layout (por su clave).
  columnas: Readonly<Record<string, string>>
  campos: readonly { clave: string; etiqueta: string }[]
}

// Las claves que se conservaron, dichas con el nombre que la persona ve. Una que no se conoce se
// deja afuera: no se inventa un nombre.
export function etiquetasDeConservados(
  claves: readonly string[],
  { columnas, campos }: EtiquetasConocidas,
): string[] {
  return claves.flatMap((clave) => {
    const etiqueta = columnas[clave] ?? campos.find((campo) => campo.clave === clave)?.etiqueta
    return etiqueta === undefined ? [] : [etiqueta]
  })
}
