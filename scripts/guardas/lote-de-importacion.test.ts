import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// El tamaño del lote de la importación de leads vive en UN punto del código, `FILAS_POR_LOTE`, y hay otros cuatro lugares que lo
// repiten porque no pueden importarlo: el tope de la RPC `leads_importar_lote` (su última migración), la prueba de la matriz de leads
// que manda un lote de más, el motivo de `escala.sql` y la medición (que lo recibe como variable de psql). Subir `FILAS_POR_LOTE` sin
// subir el de la base haría que la pantalla mandara lotes que la base rechaza («Un lote lleva de 1 a 50 filas.»); esta prueba lo impide.
// Se probó pasar a 100 en el cierre 4 y se quedó en 50 (`docs/DECISIONES.md`): cambiarlo es un cambio en estos cinco sitios a la vez.

const RAIZ = process.cwd()
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf8')

const FILAS_POR_LOTE = Number(
  /export const FILAS_POR_LOTE = (\d+)\b/.exec(
    leer('src/modules/leads/entities/importacion/limites.ts'),
  )?.[1],
)

// La última migración que (re)define la RPC es la que vale.
function definicionVigente(): { archivo: string; texto: string } {
  const archivos = readdirSync(join(RAIZ, 'supabase/migrations'))
    .filter((nombre) => nombre.endsWith('.sql'))
    .sort()
  const definen = archivos.filter((nombre) =>
    /create or replace function public\.leads_importar_lote\(/.test(
      leer(`supabase/migrations/${nombre}`),
    ),
  )
  const archivo = definen.at(-1) ?? ''
  return { archivo, texto: leer(`supabase/migrations/${archivo}`) }
}

describe('el lote de la importación de leads', () => {
  it('FILAS_POR_LOTE es un número de verdad', () => {
    expect(Number.isInteger(FILAS_POR_LOTE)).toBe(true)
    expect(FILAS_POR_LOTE).toBeGreaterThan(0)
    expect(500 % FILAS_POR_LOTE, 'un archivo de 500 filas se parte en lotes enteros').toBe(0)
  })

  it('el tope de la RPC en su última migración es FILAS_POR_LOTE, en la condición y en el mensaje', () => {
    const { archivo, texto } = definicionVigente()
    const cuerpo = texto.slice(
      texto.indexOf('create or replace function public.leads_importar_lote('),
    )
    const tope = /jsonb_array_length\(p_filas\) > (\d+)/.exec(cuerpo)?.[1]
    const mensaje = /Un lote lleva de 1 a (\d+) filas\./.exec(cuerpo)?.[1]
    expect(Number(tope), `${archivo}: el tope de la condición`).toBe(FILAS_POR_LOTE)
    expect(Number(mensaje), `${archivo}: el número del mensaje`).toBe(FILAS_POR_LOTE)
  })

  it('la matriz de leads manda un lote de uno más y espera el mensaje con el tope', () => {
    const matriz = leer('supabase/tests/matriz-leads.sql')
    const mensajes = [...matriz.matchAll(/Un lote lleva de 1 a (\d+) filas\./g)].map((m) =>
      Number(m[1]),
    )
    expect(mensajes.length).toBeGreaterThan(0)
    for (const numero of mensajes) {
      expect(numero).toBe(FILAS_POR_LOTE)
    }
    const deMas =
      /generate_series\(1, (\d+)\)\)\)', gen_random_uuid\(\), v_lote\)\);\s*perform pg_temp\.espero\(r, '22023', 'Un lote lleva de 1 a \d+ filas\.', '(\d+) filas en un lote'\)/.exec(
        matriz,
      )
    expect(Number(deMas?.[1]), 'filas que manda la prueba').toBe(FILAS_POR_LOTE + 1)
    expect(Number(deMas?.[2]), 'filas que dice el nombre de la prueba').toBe(FILAS_POR_LOTE + 1)
  })

  it('el motivo de escala.sql dice el mismo tope', () => {
    const motivo = /'leads_importar_lote', 'un lote de importación son a lo sumo (\d+) filas/.exec(
      leer('supabase/tests/escala.sql'),
    )?.[1]
    expect(Number(motivo)).toBe(FILAS_POR_LOTE)
  })

  it('la medición recibe el lote del código y no escribe ningún tamaño', () => {
    const medicion = leer('supabase/tests/medir-importacion.sql')
    expect(medicion).toContain(':lote')
    expect(medicion, 'un 50 escrito a mano en la medición').not.toMatch(
      /generate_series\(1, \d+\) j|i \* \d+ \+ j|0\.\.\d+ loop/,
    )
    expect(leer('scripts/medir-listado.mjs')).toMatch(
      /lote: constante\('src\/modules\/leads\/entities\/importacion\/limites\.ts', 'FILAS_POR_LOTE'\)/,
    )
  })
})
