// La vista previa del editor de la fórmula (4.21-3a-2, P5): `evaluar()` con las cifras de prueba (los datos en 0, las opciones apagadas, la variante por defecto, los
// tipos de cambio de hoy y las tablas vivas). Puro y nunca lanza: lo que el motor rechaza es un resultado («no calcula»), no una excepción. Lo que dice cada fila
// sale de `cifraDeLaFila()` con un solo recorrido de los resultados, que el editor arma una vez por cambio aplicado.
import type { Formula } from '../formula'
import { evaluar } from '../motor'
import { ErrorDelMotor } from '../motor-errores'
import type { CodigoDeFaltante, Estado, ValorGuardado } from '../motor-contexto'
import type { Formato, Nodo } from '../nodos'
import { entradaDePrueba, type TerrenoDePrueba } from './terreno-de-prueba'

export type TotalesDeLaVistaPrevia = { usd: number | null; bs: number | null }

export type VistaPrevia =
  // Aún no hay fórmula validada: lo que valga se dice en la fila marcada.
  | { tipo: 'no_valida' }
  // El motor la rechazó con lo de prueba (p. ej. una variante sin opción por defecto).
  | { tipo: 'no_calcula' }
  | {
      tipo: 'calculada'
      valores: ReadonlyMap<string, ValorGuardado>
      estados: ReadonlyMap<string, Estado>
      // El primer faltante que nació en cada nodo.
      faltantes: ReadonlyMap<string, CodigoDeFaltante>
      totales: TotalesDeLaVistaPrevia
    }

// `formulaValidada` es la que devolvió `validarFormula()` (nula si no validó). Nunca lanza ni toca lo que recibe.
export function calcularLaVistaPrevia(
  formulaValidada: Formula | null,
  terreno: TerrenoDePrueba,
): VistaPrevia {
  if (formulaValidada === null) return { tipo: 'no_valida' }
  try {
    const r = evaluar(formulaValidada, entradaDePrueba(terreno))
    const faltantes = new Map<string, CodigoDeFaltante>()
    for (const f of r.faltantes) {
      if (!faltantes.has(f.donde)) faltantes.set(f.donde, f.codigo)
    }
    return {
      tipo: 'calculada',
      valores: new Map(Object.entries(r.valores)),
      estados: new Map(Object.entries(r.estados)),
      faltantes,
      totales: { usd: r.totales.usd, bs: r.totales.bs },
    }
  } catch (error) {
    if (error instanceof ErrorDelMotor) return { tipo: 'no_calcula' }
    throw error
  }
}

export type CifraDeLaFila =
  // Una bandera, o sin vista calculada: la fila no dibuja nada.
  | { tipo: 'nada' }
  | { tipo: 'valor'; valor: number; formato: Formato | undefined }
  // La variante (su clave) o un texto.
  | { tipo: 'texto'; texto: string }
  // Sin cifra: `faltante` es lo que falta en esta fila; nulo, algo aguas arriba.
  | { tipo: 'sin_cifra'; faltante: CodigoDeFaltante | null }
  | { tipo: 'apagada'; estado: Exclude<Estado, 'activo'> }

export function cifraDeLaFila(vista: VistaPrevia, nodo: Nodo): CifraDeLaFila {
  if (vista.tipo !== 'calculada' || nodo.tipo === 'bandera') return { tipo: 'nada' }
  const estado = vista.estados.get(nodo.id)
  if (estado !== undefined && estado !== 'activo') return { tipo: 'apagada', estado }
  const valor = vista.valores.get(nodo.id)
  if (typeof valor === 'string') return { tipo: 'texto', texto: valor }
  if (valor === undefined || valor === null) {
    return { tipo: 'sin_cifra', faltante: vista.faltantes.get(nodo.id) ?? null }
  }
  return { tipo: 'valor', valor, formato: nodo.formato }
}
