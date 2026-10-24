import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { REGLAS_DE_DISENO } from './motivos-de-diseno'
import { validarDiseno } from './validar-diseno'
import { validarFormula } from './validar'

// El juego compartido con la base (`supabase/tests/validar-diseno.sql` lo lee desde acá). Se lee como dato, no como módulo.
const esquemaRegla = z.enum(REGLAS_DE_DISENO)
const esquemaContexto = z.strictObject({
  niveles: z.array(z.string()),
  retirados: z.array(z.string()),
  tonos: z.array(z.string()),
})
const esquemaFormula = z.strictObject({ definicion: z.unknown(), params: z.unknown() })
const esquemaCaso = z.object({
  nombre: z.string().min(1),
  valida: z.boolean(),
  motivo: z.strictObject({ regla: esquemaRegla, donde: z.string().optional() }).optional(),
  formula: z.string().optional(),
  formula_de: z.string().optional(),
  contexto: esquemaContexto.optional(),
  diseno: z.unknown(),
})
const esquemaJuego = z.strictObject({
  descripcion: z.string(),
  contexto: esquemaContexto,
  formulas: z.record(z.string(), esquemaFormula),
  casos: z.array(esquemaCaso),
})

const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8')
const juego = esquemaJuego.parse(JSON.parse(leer('./casos-de-diseno.json')))
const deFormulas = esquemaFormula
  .extend({ nombre: z.string() })
  .array()
  .parse(
    (JSON.parse(leer('./casos-de-formula.json')) as { casos: Record<string, unknown>[] }).casos.map(
      (c) => ({ nombre: c['nombre'], definicion: c['definicion'], params: c['params'] }),
    ),
  )

function formulaDe(c: z.infer<typeof esquemaCaso>) {
  const cruda =
    c.formula !== undefined
      ? juego.formulas[c.formula]
      : deFormulas.find((f) => f.nombre === c.formula_de)
  if (cruda === undefined) throw new Error(`«${c.nombre}» no nombra una fórmula que exista`)
  const r = validarFormula(cruda.definicion, cruda.params)
  if (!r.ok) throw new Error(`la fórmula de «${c.nombre}» no valida: ${r.error.mensaje}`)
  return r.formula.definicion
}

describe('casos-de-diseno.json', () => {
  it.each(juego.casos)('$nombre', (c) => {
    const r = validarDiseno(formulaDe(c), c.diseno, c.contexto ?? juego.contexto)
    // Si no da lo esperado, el error muestra el rechazo entero (o «válida»).
    const visto = r.ok ? 'válida' : r.error
    if (c.valida) expect(visto).toBe('válida')
    else expect(visto).toMatchObject(c.motivo ?? {})
    // `donde` también cuando falta: un rechazo sin `donde` no es uno con otro.
    if (!c.valida && c.motivo !== undefined && !r.ok) expect(r.error.donde).toBe(c.motivo.donde)
  })
})

describe('el juego', () => {
  it('cada regla tiene al menos un caso, cada inválido dice su motivo y los válidos no', () => {
    const cubiertas = new Set(juego.casos.map((c) => c.motivo?.regla))
    for (const regla of REGLAS_DE_DISENO) expect(cubiertas, regla).toContain(regla)
    for (const c of juego.casos) expect(c.motivo === undefined, c.nombre).toBe(c.valida)
  })

  it('los nombres no se repiten y cada caso nombra su fórmula de una sola manera', () => {
    const nombres = juego.casos.map((c) => c.nombre)
    expect(new Set(nombres).size).toBe(nombres.length)
    for (const c of juego.casos) {
      expect((c.formula === undefined) !== (c.formula_de === undefined), c.nombre).toBe(true)
    }
  })

  it('las fórmulas que usa validan: el diseño sólo se valida contra una fórmula válida', () => {
    for (const c of juego.casos) expect(() => formulaDe(c), c.nombre).not.toThrow()
  })

  it('trae un «__proto__» en cada nivel, con y sin donde', () => {
    const protos = juego.casos.filter((c) => c.nombre.includes('«__proto__»'))
    expect(protos.length).toBeGreaterThanOrEqual(8)
    expect(protos.every((c) => !c.valida && c.motivo?.regla === 'forma')).toBe(true)
    expect(new Set(protos.map((c) => c.motivo?.donde)).size).toBeGreaterThanOrEqual(3)
  })

  it('un caso de orden por pasada: cada regla de una pasada anterior gana a la de la siguiente', () => {
    expect(juego.casos.filter((c) => c.nombre.startsWith('orden')).length).toBeGreaterThanOrEqual(
      20,
    )
  })
})
