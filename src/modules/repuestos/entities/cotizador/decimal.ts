// Decimales exactos para el cotizador de repuestos (8.12-1, C5): un monto es un entero a escala fija (`bigint`), nunca un `float`.
// `aEscala('12.5', 2)` = 1250n; `aTexto(1250n, 2)` = '12.50'. Sólo valores ≥ 0: el cotizador no tiene montos negativos.

const DECIMAL = /^(\d+)(?:\.(\d+))?$/

/** El texto como entero a `escala` decimales, o `null` si no es un decimal ≥ 0 o trae más decimales que la escala. */
export function aEscala(texto: string, escala: number): bigint | null {
  const m = DECIMAL.exec(texto.trim())
  if (!m) return null
  const entera = m[1] ?? '0'
  const fraccion = m[2] ?? ''
  if (fraccion.length > escala) {
    // Ceros de más a la derecha no cambian el valor ('1.2500' a escala 2 es 1.25).
    if (/[^0]/.test(fraccion.slice(escala))) return null
  }
  const ajustada = fraccion.slice(0, escala).padEnd(escala, '0')
  return BigInt(entera + ajustada)
}

/** El entero a `escala` decimales como texto con exactamente esos decimales. */
export function aTexto(n: bigint, escala: number): string {
  const s = n.toString().padStart(escala + 1, '0')
  if (escala === 0) return s
  return `${s.slice(0, -escala)}.${s.slice(-escala)}`
}

/** 10^n como bigint. */
export function potencia(n: number): bigint {
  return 10n ** BigInt(n)
}
