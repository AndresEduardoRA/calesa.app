import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { leerPlan } from '../coordinador/plan.mjs'
import { leerCambios, problemasDelPr } from './carriles.mjs'

// Lo que un PR puede tocar según su carril (docs/ORCA.md, docs/plan.yaml de la base): un carril que no es base ni ESTADO, PLAN, DECISIONES,
// BITACORA ni migraciones de otro dominio; todo PR, migraciones nuevas posteriores a la última de la base y ninguna aplicada editada.
const BASE = '20261028183622'
type Cambio = { estado: string; ruta: string; antes?: string }
const PLAN = leerPlan(`
esquema: plan/v1
compartido: [supabase/migrations/, supabase/tests/, e2e/, src/shared/types/]
carriles:
  - id: a
    base: true
    dueno_de: [src/, docs/]
  - id: b
    migraciones: [formula, diseno, tablas]
    dueno_de: [src/modules/cotizaciones/areas/formula/]
  - id: c
    migraciones: [papelera]
    dueno_de: [src/modules/cotizaciones/areas/papelera/]
  - id: d
    dueno_de: [src/modules/x/]
`)
const revisar = (rama: string, ...cambios: Cambio[]) =>
  problemasDelPr({ rama, cambios, ultimaDeLaBase: BASE, plan: PLAN })
const nueva = (nombre: string) => ({ estado: 'A', ruta: `supabase/migrations/${nombre}.sql` })
const SOLO_DE_A = ['docs/ESTADO.md', 'docs/PLAN.md', 'docs/DECISIONES.md', 'docs/BITACORA.md']

describe('carriles › un paso prestado se juzga con el carril del paso', () => {
  const CON_PASOS = leerPlan(`
esquema: plan/v1
compartido: [supabase/migrations/]
carriles:
  - id: a
    base: true
    dueno_de: [src/, docs/]
  - id: b
    migraciones: [diseno]
    dueno_de: [src/modules/cotizaciones/areas/diseno/]
  - id: c
    migraciones: [papelera]
    dueno_de: [src/modules/cotizaciones/areas/papelera/]
pasos:
  - { id: '4.22', carril: b, riesgo: ambar, modulos: [src/modules/cotizaciones/areas/diseno/] }
  - { id: '4.27', carril: a, riesgo: rojo, modulos: [src/] }
`)
  const juzgar = (rama: string, ...cambios: Cambio[]) =>
    problemasDelPr({ rama, cambios, ultimaDeLaBase: BASE, plan: CON_PASOS })
  it('c/4.22 (del b) crea migraciones de diseño y toca el área del b; no las de la papelera', () => {
    const area = { estado: 'M', ruta: 'src/modules/cotizaciones/areas/diseno/x.ts' }
    expect(juzgar('c/4.22', nueva('20261108000000_diseno_x'), area)).toEqual([])
    expect(juzgar('c/4.22', nueva('20261108000000_papelera_x'))).toEqual([
      expect.stringContaining('el carril b crea migraciones sólo de diseno'),
    ])
  })
  it('b/4.27 (del base) toca lo que quiere; un pedido o una rama sin paso, por su prefijo', () => {
    expect(juzgar('b/4.27', { estado: 'M', ruta: 'docs/ESTADO.md' })).toEqual([])
    expect(juzgar('b/pedido-4', { estado: 'M', ruta: 'docs/ESTADO.md' })).toEqual([
      expect.stringContaining('lo escribe en docs/pasos/'),
    ])
  })
})

describe('carriles › un carril que no es base', () => {
  it.each(['b/4.20', 'c/4.24'])('%s no edita ESTADO, PLAN, DECISIONES ni BITACORA', (rama) => {
    for (const ruta of SOLO_DE_A) {
      expect(revisar(rama, { estado: 'M', ruta })).toEqual([
        expect.stringContaining('lo escribe en docs/pasos/'),
      ])
    }
  })

  it('anota en docs/pasos y crea migraciones de sus dominios', () => {
    expect(
      revisar(
        'b/4.20',
        { estado: 'A', ruta: 'docs/pasos/4.20/bitacora.md' },
        nueva('20261101120000_formula_versiones'),
        nueva('20261101120001_tablas'),
      ),
    ).toEqual([])
  })

  it('una migración de otro dominio es del carril A, nombrando los del carril', () => {
    expect(revisar('b/x', nueva('20261101120000_notificaciones_push'))).toEqual([
      expect.stringContaining('sólo de formula, diseno, tablas'),
    ])
    expect(revisar('b/x', nueva('20261101120000_formulax'))).toHaveLength(1)
  })

  it('cada carril, sus dominios: c no crea los de b y sí los suyos', () => {
    expect(revisar('c/x', nueva('20261101120000_formula_x'))).toHaveLength(1)
    expect(revisar('c/x', nueva('20261101120000_papelera_lotes'))).toEqual([])
  })

  it('sin `migraciones`, no crea ninguna', () => {
    expect(revisar('d/x', nueva('20261101120000_x_y'))).toEqual([
      expect.stringContaining('el carril d no crea migraciones'),
    ])
  })

  it('sin docs/plan.yaml en la base cae todo PR, también el del carril base y la preparación', () => {
    for (const rama of ['a/x', 'preparar-orca', 'b/x']) {
      expect(problemasDelPr({ rama, cambios: [], ultimaDeLaBase: BASE, plan: null })).toEqual([
        expect.stringContaining('no lo pude leer en la base'),
      ])
    }
  })

  it('el carril A, la preparación y las ramas sin carril tocan ESTADO y crean migraciones de cualquier dominio', () => {
    for (const rama of ['a/fase-5', 'preparar-orca', 'dependabot/npm/x', 'b']) {
      expect(
        revisar(
          rama,
          { estado: 'M', ruta: 'docs/ESTADO.md' },
          nueva('20261101120000_flujos_fases'),
        ),
      ).toEqual([])
    }
  })

  // En la Fase 4 los dominios eran las áreas de `cotizaciones`; desde las fases 5 a 9 son los de las tablas que cada carril trabaja.
  it('el plan real: cada carril que no es base tiene sus dominios de migración, con nombre de dominio y sin repetir', () => {
    const real = leerPlan(readFileSync('docs/plan.yaml', 'utf8'))
    const ajenos = real.carriles.filter((x: { base?: boolean }) => x.base !== true)
    expect(ajenos.length).toBeGreaterThan(0)
    const todos: string[] = []
    for (const c of ajenos) {
      const dominios = c.migraciones as string[]
      expect(dominios.length, `carril ${String(c.id)}`).toBeGreaterThan(0)
      for (const d of dominios) expect(d).toMatch(/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/)
      todos.push(...dominios)
    }
    expect(new Set(todos).size).toBe(todos.length)
  })
})

describe('carriles › las migraciones de todo PR', () => {
  it('una nueva no anterior ni igual a la última de la base', () => {
    expect(revisar('a/x', nueva(`${BASE}_flujos`))).toEqual([
      expect.stringContaining('no es posterior'),
    ])
    expect(revisar('a/x', nueva('20261020000000_flujos'))).toEqual([
      expect.stringContaining('no es posterior'),
    ])
  })

  it('una aplicada no se edita, no se borra ni se renombra', () => {
    const vieja = 'supabase/migrations/20261028180656_base.sql'
    expect(revisar('a/x', { estado: 'M', ruta: vieja })).toEqual([
      expect.stringContaining('no se edita'),
    ])
    expect(revisar('a/x', { estado: 'D', ruta: vieja })).toEqual([
      expect.stringContaining('no se edita'),
    ])
    expect(
      revisar('a/x', {
        estado: 'R100',
        antes: vieja,
        ruta: 'supabase/migrations/20261101000000_base.sql',
      }),
    ).toEqual([expect.stringContaining('no se edita')])
  })

  it('la única excepción: el PR del aplastado borra las migraciones anteriores a la base, y sólo borrarlas', () => {
    const anterior = 'supabase/migrations/20261019009000_cotizacion_hoja_abierta.sql'
    expect(revisar('preparar-orca', { estado: 'D', ruta: anterior })).toEqual([])
    expect(revisar('preparar-orca', { estado: 'M', ruta: anterior })).toEqual([
      expect.stringContaining('no se edita'),
    ])
  })

  it('lee el name-status de git, renombres incluidos', () => {
    expect(leerCambios('M\tdocs/PLAN.md\nR087\tviejo.ts\tnuevo.ts\n')).toEqual([
      { estado: 'M', ruta: 'docs/PLAN.md' },
      { estado: 'R087', ruta: 'nuevo.ts', antes: 'viejo.ts' },
    ])
  })

  it('el CLI sobre el repo real: el PR vacío cumple', () => {
    const salida = execFileSync('node', ['scripts/guardas/carriles.mjs', 'HEAD', 'b/prueba'], {
      encoding: 'utf8',
    })
    expect(salida).toContain('✓ carriles: 0 archivos')
  })
})
