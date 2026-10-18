// Lo puro del reporter que conserva los artefactos de un e2e que falló (`e2e/soporte/reporter-de-fallos.ts`).

export const CARPETA_DE_FALLOS = 'e2e-fallos'
export const FALLOS_GUARDADOS = 5

// El nombre de la carpeta de una corrida: la fecha y la hora, que ordenan como texto.
export function marcaDeFecha(ahora: Date): string {
  return ahora.toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
}

// Las carpetas que sobran para que queden las `guardados` más nuevas.
export function sobrantes(existentes: readonly string[], guardados: number): string[] {
  return [...existentes].sort().slice(0, Math.max(0, existentes.length - guardados))
}
