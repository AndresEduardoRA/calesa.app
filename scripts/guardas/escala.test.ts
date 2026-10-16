import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buscarInfracciones } from './escala'
import { EXCEPCIONES, TABLAS_ACOTADAS } from './excepciones-de-escala'

// La guarda de código de `.claude/rules/escala.md`: ninguna consulta de `src/` cuenta el total, pagina con
// `.range()`, pide todas las columnas ni lee una lista que crece sin tope. Lo que se deja pasar está en
// `excepciones-de-escala.ts`, con su motivo y su tope. Corre en `pnpm test`.

const RAIZ = process.cwd()
const SIN_SEGUIR = /(node_modules|\.next|\.test\.|\.spec\.|database\.types)/

function* archivos(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name)
    if (SIN_SEGUIR.test(ruta)) {
      continue
    }
    if (e.isDirectory()) {
      yield* archivos(ruta)
    } else if (/\.tsx?$/.test(e.name)) {
      yield ruta
    }
  }
}

function hallazgos() {
  const salida: { archivo: string; regla: string; linea: number; texto: string }[] = []
  for (const ruta of archivos(join(RAIZ, 'src'))) {
    const archivo = relative(RAIZ, ruta).replaceAll('\\', '/')
    for (const i of buscarInfracciones(readFileSync(ruta, 'utf8'), TABLAS_ACOTADAS)) {
      salida.push({ archivo, ...i })
    }
  }
  return salida
}

const conocida = (h: { archivo: string; regla: string }) =>
  EXCEPCIONES.some((e) => e.archivo === h.archivo && e.regla === h.regla)

describe('el detector', () => {
  const sin = {}
  it('encuentra un conteo exacto, un head, un range y un select de todo', () => {
    const reglas = (texto: string) => buscarInfracciones(texto, sin).map((i) => i.regla)
    expect(reglas(".select('id', { count: 'exact', head: true })")).toEqual(['count', 'head'])
    expect(reglas('consulta.range(0, 49)')).toEqual(['range'])
    expect(reglas(".select('*')")).toEqual(['select-todo'])
    expect(reglas('.select()')).toEqual([])
  })

  it('una lectura de una lista que crece pide tope en la misma función', () => {
    const sinTope = "async function f() { return supabase.from('leads_vista').select('id') }"
    expect(buscarInfracciones(sinTope, sin).map((i) => i.regla)).toEqual(['sin-tope:leads_vista'])
    for (const fin of ['.limit(51)', '.single()', ".eq('id', id)", ".in('id', ids)"]) {
      const texto = `async function f() { return supabase.from('leads_vista').select('id')${fin} }`
      expect(buscarInfracciones(texto, sin)).toEqual([])
    }
  })

  it('arma la consulta en dos sentencias: el tope de la segunda cuenta', () => {
    const texto = `
      export const g = async () => {
        const base = supabase.from('vehiculos').select('id')
        return base.order('creado_en').limit(51)
      }`
    expect(buscarInfracciones(texto, sin)).toEqual([])
  })

  it("un select('*') de una tabla acotada no cuenta; de una que crece, sí", () => {
    const acotada = { ajustes: { motivo: 'x', tope: 'y' } }
    const de = (tabla: string) =>
      `async function f() { return supabase.from('${tabla}').select('*').limit(1) }`
    expect(buscarInfracciones(de('ajustes'), acotada)).toEqual([])
    expect(buscarInfracciones(de('leads'), acotada).map((i) => i.regla)).toEqual(['select-todo'])
  })

  it('una tabla acotada se lee entera', () => {
    const texto = "async function f() { return supabase.from('roles').select('id') }"
    expect(buscarInfracciones(texto, { roles: { motivo: 'x', tope: 'y' } })).toEqual([])
  })
})

describe('src/', () => {
  it('ninguna consulta cuenta el total, pagina con range, pide todo o lee sin tope, salvo lo excepcionado', () => {
    const nuevas = hallazgos().filter((h) => !conocida(h))
    expect(
      nuevas.map((h) => `${h.archivo}:${String(h.linea)} [${h.regla}] ${h.texto}`),
      'Una consulta nueva rompe la regla de escala: ponle tope (.limit(tope + 1)) o, si de verdad no crece, agrégala a scripts/guardas/excepciones-de-escala.ts con su motivo y su tope.',
    ).toEqual([])
  })

  it('cada excepción sigue haciendo falta y dice su motivo y su tope', () => {
    const vivos = hallazgos()
    for (const e of EXCEPCIONES) {
      expect(e.motivo.length, `${e.archivo}: sin motivo`).toBeGreaterThan(10)
      expect(e.tope.length, `${e.archivo}: sin tope`).toBeGreaterThan(0)
      expect(
        vivos.some((h) => h.archivo === e.archivo && h.regla === e.regla),
        `${e.archivo} [${e.regla}]: la excepción ya no coincide con nada; sácala`,
      ).toBe(true)
    }
    for (const [tabla, t] of Object.entries(TABLAS_ACOTADAS)) {
      expect(t.motivo.length, `${tabla}: sin motivo`).toBeGreaterThan(10)
      expect(t.tope.length, `${tabla}: sin tope`).toBeGreaterThan(0)
    }
  })

  it('cada tabla acotada se lee en algún lugar (si no, se saca de la lista)', () => {
    const texto = [...archivos(join(RAIZ, 'src'))].map((r) => readFileSync(r, 'utf8')).join('\n')
    for (const tabla of Object.keys(TABLAS_ACOTADAS)) {
      expect(texto, `${tabla}: ninguna consulta la lee`).toContain(`.from('${tabla}')`)
    }
  })
})
