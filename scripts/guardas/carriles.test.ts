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

  it('el plan real: cada dominio de un carril es un área suya, y cada área suya es un dominio', () => {
    const real = leerPlan(readFileSync('docs/plan.yaml', 'utf8'))
    for (const c of real.carriles.filter((x: { base?: boolean }) => x.base !== true)) {
      const areas = (c.dueno_de as string[])
        .map((d) => /^src\/modules\/cotizaciones\/areas\/([a-z-]+)\/$/.exec(d)?.[1])
        .filter(Boolean)
      expect([...(c.migraciones as string[])].sort()).toEqual([...areas].sort())
    }
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
