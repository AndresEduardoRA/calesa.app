import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Arnes, pasoListo } from './bucle.arnes'

// Sin compuertas (la persona, 2026-11-08: «ya no quiero compuertas, todo decídelo tú en automático»): con PILOTO_AUTO «todo», lo de
// omisión, ningún aviso llega al celular; el SQL de seguridad se aprueba solo antes de publicar.
vi.setConfig({ testTimeout: 60_000 })

let a: Arnes
beforeEach(() => {
  a = new Arnes()
})
afterEach(() => a.limpiar())

const TODO = { PILOTO_AUTO: 'todo', PILOTO_PARADA_ESPERAS: '' }

describe('bucle.sh › sin compuertas (PILOTO_AUTO «todo»)', () => {
  it('un aviso se contesta solo con la opción que sigue, sin abrir la sesión de decidir', () => {
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    const r = a.correr(['--hasta', '4.99'], { ...TODO, PILOTO_DISCO_MAX: '1' })
    expect(r.estado, r.salida).toBe(0)
    expect(a.secuencia().filter((l) => l.startsWith('decidir:'))).toEqual([])
    expect(a.estado('registro.md')).toContain('contestada sola, sin compuertas: sigo')
    expect(a.estado('decisiones-automaticas.md')).toContain('→ sigo')
    expect(a.secuencia()).toContain('publicar:4.99')
  })

  it('agotadas las del mismo motivo, para ese carril y lo dice', () => {
    const r = a.correr([], { ...TODO, PILOTO_DISCO_MAX: '1', PILOTO_PARADAS_AUTO_MAX: '0' })
    expect(r.estado, r.salida).toBe(0)
    expect(a.secuencia().filter((l) => l.startsWith('decidir:'))).toEqual([])
    expect(a.estado('registro.md')).toContain('parado (decisión automática')
    expect(a.llamadas('ruteo')).toEqual([])
  })

  it('el SQL de seguridad del rango se aprueba solo antes de publicar, y queda anotado', () => {
    a.paso(
      1,
      pasoListo({
        'supabase/migrations/20990101000000_x.sql':
          'create function public.x() returns int language sql as $$ select 1 $$;\ngrant execute on function public.x() to authenticated;\n',
      }),
    )
    const r = a.correr(['--hasta', '4.99'], TODO)
    expect(r.estado, r.salida).toBe(0)
    expect(existsSync(join(a.comun, 'aprobado-4.99'))).toBe(true)
    expect(a.estado('decisiones-automaticas.md')).toContain('SQL de seguridad aprobado solo')
    expect(a.secuencia()).toContain('publicar:4.99')
  })

  it('sin «datos» en PILOTO_AUTO, el SQL de seguridad no se aprueba solo', () => {
    a.paso(
      1,
      pasoListo({
        'supabase/migrations/20990101000000_x.sql': 'grant select on t to authenticated;\n',
      }),
    )
    a.correr(['--hasta', '4.99'], { PILOTO_AUTO: 'producto' })
    expect(existsSync(join(a.comun, 'aprobado-4.99'))).toBe(false)
  })

  it('el patrón de SQL de seguridad es el mismo que el de publicar.sh', () => {
    const de = (archivo: string, nombre: string) =>
      new RegExp(`^${nombre}='([^']+)'`, 'm').exec(
        readFileSync(resolve('scripts/piloto', archivo), 'utf8'),
      )?.[1]
    expect(de('cierre.sh', 'SEGURIDAD_SQL')).toBe(de('publicar.sh', 'SEGURIDAD'))
  })
})
