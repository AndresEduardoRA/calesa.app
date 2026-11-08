import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'

import { leerPlan } from '../coordinador/plan.mjs'
import { problemasDelPr } from './carriles.mjs'
import { FAMILIAS_DEL_COMPILADOR, MODULO_DEL_COMPILADOR } from './familias-del-compilador.mjs'
import { FAMILIAS_DEL_COMPILADOR as DE_AREAS } from './areas-de-cotizaciones-plan'
import { MODULO } from './areas-de-cotizaciones'

// Lo que un carril que no es base cambia en docs/plan.yaml (C5) y lo que toca fuera de lo suyo (C6), 4.15-5.
const M = 'src/modules/cotizaciones/'
const TEXTO = `
esquema: plan/v1
semilla: x
compartido: [supabase/migrations/, supabase/tests/, e2e/, src/shared/types/]
carriles:
  - id: a
    base: true
    dueno_de: [src/, docs/]
  - id: b
    migraciones: [formula]
    dueno_de: [${M}areas/formula/, ${M}entities/compilador.ts]
  - id: c
    migraciones: [papelera]
    dueno_de: [${M}areas/papelera/]
pasos:
  - { id: '4.23', carril: b, riesgo: rojo, modulos: [${M}areas/formula/] }
`
type Cambio = { estado: string; ruta: string; antes?: string }
const base = parse(TEXTO)
const clon = () => structuredClone(base)
const revisar = (rama: string, cambios: Cambio[], pr: unknown = base) =>
  problemasDelPr({
    rama,
    cambios,
    ultimaDeLaBase: '20261028183622',
    plan: leerPlan(TEXTO),
    crudos: { base, pr },
  })
const PLAN_YAML = { estado: 'M', ruta: 'docs/plan.yaml' }
const suma = (...rutas: string[]) => {
  const p = clon()
  p.carriles[1].dueno_de.push(...rutas)
  return p
}

describe('carriles › lo que un carril que no es base cambia en docs/plan.yaml (P1)', () => {
  const nuevo = `${M}entities/compilador-nuevo.ts`
  it('suma un archivo del compilador que el PR crea (y un comentario no cuenta)', () => {
    expect(revisar('b/x', [PLAN_YAML, { estado: 'A', ruta: nuevo }], suma(nuevo))).toEqual([])
    expect(revisar('b/x', [PLAN_YAML], base)).toEqual([])
  })

  it.each([
    ['uno que no crea', `${M}entities/validar-x.ts`, []],
    ['uno fuera del módulo', 'src/shared/lib/x.ts', [{ estado: 'A', ruta: 'src/shared/lib/x.ts' }]],
    ['uno del núcleo', `${M}entities/hoja-x.ts`, [{ estado: 'A', ruta: `${M}entities/hoja-x.ts` }]],
  ])('suma %s → cae', (_t, ruta, creados) => {
    expect(revisar('b/x', [PLAN_YAML, ...creados], suma(ruta))).toEqual(
      expect.arrayContaining([expect.stringContaining(`suma ${ruta} a su dueno_de`)]),
    )
  })

  it('cualquier otro cambio cae: dueno_de de c, migraciones, base, orden, compartido, el riesgo del 4.23', () => {
    const cambios: ((p: typeof base) => void)[] = [
      (p) => p.carriles[2].dueno_de.push('src/x.ts'),
      (p) => (p.carriles[2].migraciones = ['formula']),
      (p) => (p.carriles[1].base = true),
      (p) => p.carriles.reverse(),
      (p) => p.compartido.push('src/'),
      (p) => (p.pasos[0].riesgo = 'ambar'),
      (p) => (p.semilla = 'y'),
      (p) => p.carriles[1].dueno_de.shift(),
    ]
    for (const cambia of cambios) {
      const p = clon()
      cambia(p)
      expect(revisar('b/x', [PLAN_YAML], p).join('\n')).toContain('docs/plan.yaml: el carril b')
    }
  })

  it('borrar docs/plan.yaml o dejarlo ilegible cae', () => {
    expect(revisar('b/x', [{ estado: 'D', ruta: 'docs/plan.yaml' }], null)).toEqual([
      expect.stringContaining('docs/plan.yaml: el carril b no lo borra'),
    ])
  })

  it('el carril base lo cambia como quiere', () => {
    const p = clon()
    p.pasos[0].riesgo = 'ambar'
    expect(revisar('a/x', [PLAN_YAML], p)).toEqual([])
  })

  it('las familias son una sola fuente', () => {
    expect(DE_AREAS).toBe(FAMILIAS_DEL_COMPILADOR)
    expect(MODULO_DEL_COMPILADOR).toBe(MODULO)
  })
})

describe('carriles › lo que un carril que no es base toca fuera de lo suyo (P2)', () => {
  const toca = (...rutas: string[]) =>
    revisar(
      'b/x',
      rutas.map((ruta) => ({ estado: 'M', ruta })),
    )

  it('lo de otro carril no base cae, con quién lo tiene', () => {
    expect(toca(`${M}areas/papelera/index.ts`)).toEqual([
      expect.stringContaining(`${M}areas/papelera/index.ts: es del carril c`),
    ])
  })

  it('lo del núcleo (del carril base) lo edita y lo agrega en su PR, sin esperar un pedido; no lo borra', () => {
    expect(toca(`${M}features/hoja/hoja.tsx`, 'src/shared/lib/permisos.ts')).toEqual([])
    expect(revisar('b/x', [{ estado: 'A', ruta: 'src/shared/lib/nuevo.ts' }])).toEqual([])
    expect(revisar('b/x', [{ estado: 'D', ruta: 'src/shared/lib/permisos.ts' }])).toEqual([
      expect.stringContaining('pero no lo borra'),
    ])
  })

  it('lo suyo, docs/ y compartido (agrega y edita) pasan', () => {
    expect(
      toca(
        `${M}areas/formula/index.ts`,
        `${M}entities/compilador.ts`,
        'supabase/tests/validar-formula.sql',
        'docs/pasos/4.20/bitacora.md',
        'src/shared/types/database.types.ts',
      ),
    ).toEqual([])
    expect(revisar('b/x', [{ estado: 'A', ruta: 'supabase/tests/x.sql' }])).toEqual([])
  })

  it('en compartido no borra, ni la ruta vieja de un renombre; en lo suyo sí', () => {
    expect(revisar('b/x', [{ estado: 'D', ruta: 'supabase/tests/x.sql' }])).toEqual([
      expect.stringContaining('el carril b no borra en supabase/tests/'),
    ])
    expect(
      revisar('b/x', [
        { estado: 'R090', antes: 'supabase/tests/x.sql', ruta: 'supabase/tests/y.sql' },
      ]),
    ).toEqual([expect.stringContaining('no borra en supabase/tests/')])
    expect(revisar('b/x', [{ estado: 'D', ruta: `${M}areas/formula/viejo.ts` }])).toEqual([])
  })

  it('un renombre desde el núcleo a su área cae por la ruta vieja', () => {
    expect(
      revisar('b/x', [
        { estado: 'R100', antes: `${M}entities/hoja.ts`, ruta: `${M}areas/formula/hoja.ts` },
      ]),
    ).toEqual([
      expect.stringContaining(
        `${M}entities/hoja.ts: el carril b edita y agrega lo del núcleo, pero no lo borra`,
      ),
    ])
  })

  it('lo sumado en el mismo PR (C5) cuenta como suyo', () => {
    const nuevo = `${M}entities/validar-x.ts`
    expect(revisar('b/x', [PLAN_YAML, { estado: 'A', ruta: nuevo }], suma(nuevo))).toEqual([])
  })

  it('el carril base toca lo que quiere', () => {
    expect(revisar('a/x', [{ estado: 'M', ruta: 'src/shared/lib/permisos.ts' }])).toEqual([])
  })
})
