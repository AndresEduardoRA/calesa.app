import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// La función edge `importar-csv` (Deno) lleva copias exactas de dos archivos puros de la app: no está verificado que `pnpm funciones`
// ni `supabase functions deploy` incluyan archivos de fuera de `supabase/functions/` (9.06-3, D23). Si cae: se editó uno solo;
// copia el de `src/` sobre el de la función (o al revés, si el cambio era de la función) y vuelve a correr las pruebas de los dos.
const RAIZ = process.cwd()
const FUNCION = 'supabase/functions/importar-csv'
const PARES = [
  ['src/shared/lib/csv/leer.ts', `${FUNCION}/leer.ts`],
  ['src/modules/datos/entities/plantillas.ts', `${FUNCION}/plantillas.ts`],
] as const

const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf8')

describe('importar-csv: las copias de la app', () => {
  it.each(PARES)('%s es idéntico a %s', (app, funcion) => {
    expect(leer(funcion), `copia ${app} sobre ${funcion}`).toBe(leer(app))
  })

  it('la función pide la misma versión de papaparse que la app', () => {
    const paquete = JSON.parse(leer('package.json')) as { dependencies: Record<string, string> }
    const deno = JSON.parse(leer(`${FUNCION}/deno.json`)) as { imports: Record<string, string> }
    const version = (paquete.dependencies['papaparse'] ?? '').replace(/^\^/, '')
    expect(version).not.toBe('')
    expect(deno.imports['papaparse'], `pon npm:papaparse@${version} en ${FUNCION}/deno.json`).toBe(
      `npm:papaparse@${version}`,
    )
  })
})
