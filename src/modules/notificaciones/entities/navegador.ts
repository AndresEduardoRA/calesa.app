// El nombre legible de un navegador, sacado de su `user_agent` («Chrome en Windows»). Nunca se muestra el `endpoint`.
const NAVEGADORES: ReadonlyArray<readonly [RegExp, string]> = [
  [/Edg(e|A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
]

const SISTEMAS: ReadonlyArray<readonly [RegExp, string]> = [
  [/Android/, 'Android'],
  [/iPhone/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'Mac'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
]

export const NAVEGADOR_DESCONOCIDO = 'Un navegador'

function primero(tabla: ReadonlyArray<readonly [RegExp, string]>, agente: string): string | null {
  return tabla.find(([patron]) => patron.test(agente))?.[1] ?? null
}

export function nombreDelNavegador(userAgent: string | null): string {
  if (userAgent === null || userAgent === '') return NAVEGADOR_DESCONOCIDO
  const navegador = primero(NAVEGADORES, userAgent)
  if (navegador === null) return NAVEGADOR_DESCONOCIDO
  const sistema = primero(SISTEMAS, userAgent)
  return sistema === null ? navegador : `${navegador} en ${sistema}`
}
