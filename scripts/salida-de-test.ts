// Lo puro de la salida que `pnpm test` guarda sola (`scripts/reporter-de-salida.ts`, cableado en `vitest.config.mts`).

import { sobrantes } from './e2e-fallos'

export const CARPETA_DE_SALIDAS = 'test-salidas'
export const SALIDAS_GUARDADAS = 5

// El nombre de la carpeta de una corrida: fecha, hora con segundos y el pid, que ordenan como texto. El pid evita que dos
// corridas que arrancan en el mismo segundo se pisen.
export function nombreDeCorrida(ahora: Date, pid: number): string {
  const marca = ahora.toISOString().slice(0, 19).replace('T', '_').replaceAll(':', '-')
  return `${marca}-${pid}`
}

// Las carpetas viejas que sobran para que queden `guardadas` contando la actual, que nunca se borra.
export function sobrantesDeSalidas(
  existentes: readonly string[],
  actual: string,
  guardadas: number,
): string[] {
  return sobrantes(
    existentes.filter((nombre) => nombre !== actual),
    Math.max(0, guardadas - 1),
  )
}

// Los códigos de color de la terminal, para que el archivo se lea y se busque con grep.
export function sinColores(texto: string): string {
  return texto.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '')
}
