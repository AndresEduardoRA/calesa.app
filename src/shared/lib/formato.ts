// Números y montos con Intl, en el locale de la empresa. Nunca `toFixed` ni concatenar símbolos.
// En pantalla los montos pasan por <Monto> (Modo Live); esto es el texto que <Monto> imprime.

export const LOCALE_POR_DEFECTO = 'es-BO'

type OpcionesNumero = { locale?: string; decimales?: number }
type OpcionesMonto = { moneda: string; locale?: string; decimales?: number }

// Construir un Intl.NumberFormat es caro y una tabla lo pide cientos de veces con las mismas opciones.
const formateadores = new Map<string, Intl.NumberFormat>()

function formateador(locale: string, opciones: Intl.NumberFormatOptions): Intl.NumberFormat {
  const clave = `${locale}|${JSON.stringify(opciones)}`
  let existente = formateadores.get(clave)
  if (!existente) {
    try {
      existente = new Intl.NumberFormat(locale, opciones)
    } catch {
      // Un locale o una moneda que `Intl` no conoce (un dato mal guardado) no puede tumbar cada
      // pantalla que imprime un número: se formatea con lo de fábrica.
      existente = new Intl.NumberFormat(LOCALE_POR_DEFECTO, { ...opciones, currency: 'USD' })
    }
    formateadores.set(clave, existente)
  }
  return existente
}

// Hasta `decimales` decimales, sin ceros de relleno: 1234.5 → «1.234,5».
export function formatearNumero(valor: number, opciones: OpcionesNumero = {}): string {
  const { locale = LOCALE_POR_DEFECTO, decimales = 2 } = opciones
  return formateador(locale, { maximumFractionDigits: decimales }).format(valor)
}

// Siempre con los decimales de la moneda (2 por defecto): 1234.5 USD → «USD 1.234,50».
export function formatearMonto(valor: number, opciones: OpcionesMonto): string {
  const { moneda, locale = LOCALE_POR_DEFECTO, decimales = 2 } = opciones
  return formateador(locale, {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor)
}

// Recibe una fracción: 0.125 → «12,5%».
export function formatearPorcentaje(fraccion: number, opciones: OpcionesNumero = {}): string {
  const { locale = LOCALE_POR_DEFECTO, decimales = 1 } = opciones
  return formateador(locale, { style: 'percent', maximumFractionDigits: decimales }).format(
    fraccion,
  )
}
