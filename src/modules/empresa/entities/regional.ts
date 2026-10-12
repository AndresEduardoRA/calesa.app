// Locale, zona horaria y código de moneda se validan contra `Intl`: es lo mismo que después usa
// la app para formatear (`formato.ts`, `fechas.ts`). Un valor que `Intl` no conoce rompería
// cada pantalla que imprime un monto o una fecha.

// Para el desplegable. Son sugerencias: se acepta cualquier locale que `Intl` conozca.
export const LOCALES_SUGERIDOS = [
  'es-AR',
  'es-BO',
  'es-CL',
  'es-CO',
  'es-EC',
  'es-ES',
  'es-MX',
  'es-PE',
  'es-PY',
  'es-US',
  'es-UY',
] as const

// La forma canónica del locale («es-bo» → «es-BO»), o null si no existe o `Intl` no lo formatea.
export function localeCanonico(texto: string): string | null {
  try {
    const [canonico] = Intl.getCanonicalLocales(texto.trim())
    if (!canonico || Intl.NumberFormat.supportedLocalesOf([canonico]).length === 0) {
      return null
    }
    return canonico
  } catch {
    return null
  }
}

export function zonaHorariaValida(texto: string): boolean {
  const zona = texto.trim()
  if (zona === '') {
    return false
  }
  try {
    new Intl.DateTimeFormat('es', { timeZone: zona })
    return true
  } catch {
    return false
  }
}

// Las zonas que conoce este entorno, para sugerir mientras se tipea.
export function zonasHorarias(): string[] {
  return Intl.supportedValuesOf('timeZone')
}

// Código ISO 4217 que `Intl` sabe imprimir («usd» → «USD»), o null.
export function codigoDeMoneda(texto: string): string | null {
  const codigo = texto.trim().toUpperCase()
  return /^[A-Z]{3}$/.test(codigo) && Intl.supportedValuesOf('currency').includes(codigo)
    ? codigo
    : null
}
