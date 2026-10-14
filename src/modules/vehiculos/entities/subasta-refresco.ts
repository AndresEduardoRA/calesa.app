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
export function fusionarRefresco(
  previo: DatosDeSubasta,
  nuevo: DatosDeSubasta,
  actual: DatosActuales,
): Refresco {
  const refresco: Refresco = { columnas: {}, atributos: {}, conservados: [] }

  for (const clave of Object.keys(nuevo.columnas) as (keyof ColumnasDeSubasta)[]) {
    const valorNuevo = nuevo.columnas[clave]
    const valorActual = actual.columnas[clave]
    const valorPrevio = previo.columnas[clave]
    if (iguales(valorNuevo, valorActual)) {
      continue
    }
    if (valorActual === undefined || iguales(valorActual, valorPrevio)) {
      Object.assign(refresco.columnas, { [clave]: valorNuevo })
    } else {
      refresco.conservados.push(clave)
    }
  }

  for (const [clave, valorNuevo] of Object.entries(nuevo.atributos)) {
    const valorActual = actual.atributos[clave]
    if (iguales(valorNuevo, valorActual)) {
      continue
    }
    if (valorActual === undefined || iguales(valorActual, previo.atributos[clave])) {
      refresco.atributos[clave] = valorNuevo
    } else {
      refresco.conservados.push(clave)
    }
  }
  return refresco
}
