import { readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { compilarExpresion, type ContextoDeCompilacion } from './compilador'
import { formulaDe } from './compilador-formula-de-prueba'
import { validarFormula } from './validar'

// Los casos «compilada: …» de `casos-de-formula.json` son fórmulas que salieron de compilar un texto con el contexto de
// `casos-del-compilador.json`. Entran al juego como válidas, y `validar_formula()` en la base las compara sola
// (`pnpm db:probar`). Esta prueba los vuelve a compilar y exige que el JSON sea igual: así no se desincronizan.
// Para regenerarlos: ACTUALIZAR_CASOS=1 pnpm vitest run <este archivo> && npx prettier --write casos-de-formula.json
// Las rutas van por variables (Vite reescribe un `new URL('literal', import.meta.url)`).
const FORMULAS = 'src/modules/cotizaciones/entities/casos-de-formula.json'
const COMPILADOR = 'src/modules/cotizaciones/entities/casos-del-compilador.json'
const PREFIJO = 'compilada: '

const TEXTOS: { nombre: string; texto: string }[] = [
  '(remate+fees)*4%',
  'SUMA(compra)',
  'remate+(fees+flete)',
  'remate/fees*flete',
  'SI(activa; remate*fees)+flete',
  'REDONDEAR(remate/fees; 2)',
  'PORCENTAJE_DE(remate; 4%)',
  'PORCENTAJE_DE(remate+fees+flete; iva)',
  'DEPRECIAR(remate; depreciacion; anio; factor)',
  '3+remate+4',
  'remate - -5',
  '-5',
].map((texto) => ({ nombre: texto, texto }))
TEXTOS.push({
  nombre: '64 paréntesis anidados',
  texto: `${'('.repeat(64)}remate${')'.repeat(64)}`,
})

type Caso = { nombre: string; valida: boolean; definicion: unknown; params: unknown }
type Juego = { casos: Caso[] } & Record<string, unknown>

const leer = <T>(ruta: string) => JSON.parse(readFileSync(ruta, 'utf8')) as T

function compilados(): Caso[] {
  const { contexto } = leer<{ contexto: ContextoDeCompilacion }>(COMPILADOR)
  return TEXTOS.map(({ nombre, texto }) => {
    const r = compilarExpresion(texto, contexto)
    if (!r.ok) throw new Error(`«${texto}» no compila: ${r.error.mensaje}`)
    const f = formulaDe(contexto, r, texto)
    return { nombre: PREFIJO + nombre, valida: true, definicion: f.definicion, params: f.params }
  })
}

describe('los casos compilados de casos-de-formula.json', () => {
  it('están al día con el compilador (para regenerarlos: ACTUALIZAR_CASOS=1)', () => {
    const juego = leer<Juego>(FORMULAS)
    const esperados = compilados()
    if (process.env['ACTUALIZAR_CASOS'] === '1') {
      const resto = juego.casos.filter((c) => !c.nombre.startsWith(PREFIJO))
      writeFileSync(
        FORMULAS,
        JSON.stringify({ ...juego, casos: [...resto, ...esperados] }, null, 2),
      )
      return
    }
    expect(juego.casos.filter((c) => c.nombre.startsWith(PREFIJO))).toEqual(esperados)
  })

  it('son válidas para validarFormula, y van al final del juego', () => {
    const casos = leer<Juego>(FORMULAS).casos
    const compilada = casos.filter((c) => c.nombre.startsWith(PREFIJO))
    expect(compilada.length).toBe(TEXTOS.length)
    expect(casos.slice(-compilada.length)).toEqual(compilada)
    for (const c of compilada) {
      const v = validarFormula(c.definicion, c.params)
      expect(v.ok ? 'válida' : v.error.mensaje, c.nombre).toBe('válida')
    }
  })
})
