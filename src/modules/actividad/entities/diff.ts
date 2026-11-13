// El diff de un cambio presentado para leerlo: cada clave con su etiqueta y cada valor con su tipo (un monto como monto, una fecha como
// fecha). La base (`actividad_diff`) ya manda sólo lo que cambió y lo que quien mira ve; acá se abre `atributos` por clave y se vuelve a
// descartar lo igual, comparado en profundidad (dentro de `atributos` la base compara el objeto entero).
import type { DiffDeActividad } from './actividad'
import { etiquetaDeCampo } from './etiquetas'

export type ValorPresentado =
  | { tipo: 'vacio' }
  // `moneda` nula con `monedaConocida: false`: el diff no la trae y nadie la pasó; se dibuja el número, nunca otra moneda inventada.
  | {
      tipo: 'monto'
      valor: number
      moneda: string | null
      enMonedaBase: boolean
      monedaConocida: boolean
    }
  | { tipo: 'fecha'; iso: string }
  | { tipo: 'si_no'; valor: boolean }
  | { tipo: 'texto'; texto: string }

export type CambioPresentado = {
  clave: string
  etiqueta: string
  antes: ValorPresentado
  despues: ValorPresentado
}

export type CampoDeAtributo = { etiqueta: string; tipo: string }

export type OpcionesDelDiff = {
  // Los campos del layout (`leads_campos` / `origenes_campos`) por clave: su etiqueta y, si es `moneda`, que su valor es un monto.
  etiquetasDeAtributos?: ReadonlyMap<string, CampoDeAtributo>
  // La moneda de la fila en cada lado, cuando el diff no trae `moneda` (no cambió). Cada lado la suya: un gasto pudo cambiar de moneda.
  monedaAntes?: string | null
  monedaDespues?: string | null
}

// Las columnas de dinero de las tablas declaradas: `fila` = en la moneda de la fila (`moneda`), `base` = en la moneda base de la empresa.
const MONTOS_POR_TABLA: Readonly<Record<string, Readonly<Record<string, 'fila' | 'base'>>>> = {
  gastos: { monto: 'fila', monto_base: 'base' },
  pagos: { monto: 'fila', monto_base: 'base' },
  repuestos_compras: { monto: 'fila', monto_base: 'base' },
  repuestos_items: { precio_cliente: 'fila' },
  vehiculos: { precio: 'base', precio_web: 'base', precio_web_hasta: 'base' },
  cotizaciones: { total_base: 'base' },
}

const CLAVES_CON_ATRIBUTOS = new Set(['atributos', 'atributos_publicos'])

function vacio(valor: unknown): boolean {
  return valor === null || valor === undefined
}

function iguales(a: unknown, b: unknown): boolean {
  if (vacio(a) || vacio(b)) {
    return vacio(a) && vacio(b)
  }
  if (typeof a !== 'object' || typeof b !== 'object') {
    return Object.is(a, b)
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false
  }
  const ka = Object.keys(a as object)
  const kb = Object.keys(b as object)
  if (ka.length !== kb.length) {
    return false
  }
  return ka.every((k) =>
    iguales((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  )
}

function comoNumero(valor: unknown): number | null {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null
  }
  if (typeof valor === 'string' && valor.trim() !== '') {
    const n = Number(valor)
    return Number.isFinite(n) ? n : null
  }
  return null
}

type Dinero = { clase: 'fila' | 'base'; moneda: string | null }

function presentar(clave: string, valor: unknown, dinero: Dinero | null): ValorPresentado {
  if (vacio(valor)) {
    return { tipo: 'vacio' }
  }
  if (dinero) {
    const n = comoNumero(valor)
    if (n !== null) {
      return dinero.clase === 'base'
        ? { tipo: 'monto', valor: n, moneda: null, enMonedaBase: true, monedaConocida: true }
        : {
            tipo: 'monto',
            valor: n,
            moneda: dinero.moneda,
            enMonedaBase: false,
            monedaConocida: dinero.moneda !== null,
          }
    }
  }
  if (typeof valor === 'boolean') {
    return { tipo: 'si_no', valor }
  }
  if (
    typeof valor === 'string' &&
    (clave.endsWith('_en') || clave.startsWith('fecha')) &&
    !Number.isNaN(Date.parse(valor))
  ) {
    return { tipo: 'fecha', iso: valor }
  }
  if (typeof valor === 'object') {
    return { tipo: 'texto', texto: JSON.stringify(valor) }
  }
  return { tipo: 'texto', texto: String(valor) }
}

function comoObjeto(valor: unknown): Record<string, unknown> {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {}
}

function textoONulo(valor: unknown): string | null {
  return typeof valor === 'string' && valor !== '' ? valor : null
}

function cambiosDeAtributos(
  tabla: string,
  clave: string,
  { antes, despues }: { antes: unknown; despues: unknown },
  campos: OpcionesDelDiff['etiquetasDeAtributos'],
): CambioPresentado[] {
  const a = comoObjeto(antes)
  const d = comoObjeto(despues)
  const salida: CambioPresentado[] = []
  for (const interna of new Set([...Object.keys(a), ...Object.keys(d)])) {
    if (iguales(a[interna], d[interna])) {
      continue
    }
    // Un campo `moneda` del layout no declara en qué moneda está (los de apibara son USD): monto con la moneda sin conocer, nunca la base.
    const dinero: Dinero | null =
      campos?.get(interna)?.tipo === 'moneda' ? { clase: 'fila', moneda: null } : null
    const completa = `${clave}.${interna}`
    salida.push({
      clave: completa,
      etiqueta: etiquetaDeCampo(tabla, completa, campos),
      antes: presentar(interna, a[interna], dinero),
      despues: presentar(interna, d[interna], dinero),
    })
  }
  return salida
}

// Cada lado con su moneda: la del diff si cambió y, si no, la que llegó por opción.
function monedasDeLosLados(
  moneda: { antes: unknown; despues: unknown } | undefined,
  opciones: OpcionesDelDiff,
): { antes: string | null; despues: string | null } {
  if (moneda) {
    return { antes: textoONulo(moneda.antes), despues: textoONulo(moneda.despues) }
  }
  return { antes: opciones.monedaAntes ?? null, despues: opciones.monedaDespues ?? null }
}

export function presentarDiff(
  diff: DiffDeActividad,
  opciones: OpcionesDelDiff = {},
): CambioPresentado[] {
  if (!diff.visible) {
    return []
  }
  const { tabla, cambios } = diff
  const montos = MONTOS_POR_TABLA[tabla] ?? {}
  const monedas = monedasDeLosLados(cambios['moneda'], opciones)
  const salida: CambioPresentado[] = []

  for (const [clave, { antes, despues }] of Object.entries(cambios)) {
    if (CLAVES_CON_ATRIBUTOS.has(clave)) {
      salida.push(
        ...cambiosDeAtributos(tabla, clave, { antes, despues }, opciones.etiquetasDeAtributos),
      )
      continue
    }
    if (iguales(antes, despues)) {
      continue
    }
    const clase = montos[clave]
    salida.push({
      clave,
      etiqueta: etiquetaDeCampo(tabla, clave),
      antes: presentar(clave, antes, clase ? { clase, moneda: monedas.antes } : null),
      despues: presentar(clave, despues, clase ? { clase, moneda: monedas.despues } : null),
    })
  }
  return salida
}
