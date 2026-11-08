// Las cifras de la vista previa del diseño (4.22-5, P3 a): `evaluar()` con los datos en 0, las banderas apagadas, la variante por defecto y sin tipos de cambio ni tablas vivas,
// en la forma que lee la hoja. El objetivo de la vista previa es el ancho y el orden de la hoja, no el número: el total puede salir «—» con su «Sin total: …». Puro y nunca
// lanza por lo que la fórmula pide; un error de código sube (es un defecto). Lo de `formula/vista-previa.ts` es de otra área y no se importa (`areas-de-cotizaciones`).
import type { RespuestaDeRecalculo } from '../recalculo'
import { evaluar } from '../motor'
import type { Entrada } from '../motor-entrada'
import { ErrorDelMotor } from '../motor-errores'
import { validarFormula } from '../validar'

// Lo que no está vale 0 (un input), apagada (una bandera) o su valor por defecto (la variante).
const ENTRADA_VACIA: Entrada = {
  inputs: {},
  banderas: {},
  tipos_cambio: {},
  vehiculo: {},
  tablas: {},
  overrides: {},
}

// Nula si la fórmula aún no valida o el motor la rechaza con la entrada vacía (p. ej. una variante sin opción por defecto): la hoja de prueba se dibuja sin cifras.
export function cifrasDelDiseno(definicion: unknown, params: unknown): RespuestaDeRecalculo | null {
  const validada = validarFormula(definicion, params)
  if (!validada.ok) {
    return null
  }
  try {
    const r = evaluar(validada.formula, ENTRADA_VACIA)
    return {
      valores: new Map(Object.entries(r.valores)),
      estados: new Map(Object.entries(r.estados)),
      fuentes: new Map(Object.entries(r.fuentes)),
      totales: { usd: r.totales.usd, bs: r.totales.bs, sumaUsd: r.totales.suma_usd },
      faltantes: r.faltantes,
      descartados: r.overrides_descartados,
      hayFaltantesOcultos: false,
    }
  } catch (error) {
    if (error instanceof ErrorDelMotor) {
      return null
    }
    throw error
  }
}
