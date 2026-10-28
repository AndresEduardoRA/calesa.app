import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

import { leerCambios, problemasDelPr } from './carriles.mjs'

// Lo que un PR puede tocar según su carril (docs/ORCA.md): B ni ESTADO, PLAN, DECISIONES, BITACORA ni migraciones de dominios
// compartidos; todo PR, migraciones nuevas posteriores a la última de la base y ninguna aplicada editada.
const BASE = '20261028183622'
const revisar = (rama: string, ...cambios: { estado: string; ruta: string; antes?: string }[]) =>
  problemasDelPr({ rama, cambios, ultimaDeLaBase: BASE })
const nueva = (nombre: string) => ({ estado: 'A', ruta: `supabase/migrations/${nombre}.sql` })

describe('carriles › el carril B', () => {
  it.each(['docs/ESTADO.md', 'docs/PLAN.md', 'docs/DECISIONES.md', 'docs/BITACORA.md'])(
    'no toca %s',
    (ruta) => {
      expect(revisar('b/notificaciones', { estado: 'M', ruta })).toEqual([
        expect.stringContaining('el carril B no edita ESTADO, PLAN, DECISIONES ni BITACORA'),
      ])
    },
  )

  it('anota en su archivo de carril y crea migraciones de sus dominios', () => {
    expect(
      revisar(
        'b/notificaciones',
        { estado: 'M', ruta: 'docs/carriles/b.md' },
        nueva('20261101120000_notificaciones_push'),
        nueva('20261101120001_web'),
        nueva('20261101120002_agenda_eventos'),
      ),
    ).toEqual([])
  })

  it.each([
    '20261101120000_leads_avisos',
    '20261101120000_notificacionesx',
    '20261101120000_cola_web',
  ])('una migración de un dominio compartido (%s) es del carril A', (nombre) => {
    expect(revisar('b/x', nueva(nombre))).toEqual([expect.stringContaining('la crea el carril A')])
  })

  it('el carril A y la preparación sí tocan ESTADO y crean migraciones de cualquier dominio', () => {
    for (const rama of ['a/fase-5', 'preparar-orca']) {
      expect(
        revisar(
          rama,
          { estado: 'M', ruta: 'docs/ESTADO.md' },
          nueva('20261101120000_flujos_fases'),
        ),
      ).toEqual([])
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
