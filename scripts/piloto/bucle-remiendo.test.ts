import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Arnes, pasoListo } from './bucle.arnes'
import {
  conMain,
  coordinador,
  dirCoord,
  entorno,
  GIT,
  integrarEnMain,
  paso,
  plan,
} from './bucle-flujo.arnes'

// Un PR devuelto que no necesita a un modelo (2026-11-08: 19 conflictos con main en un día, cada uno una sesión y un CI): main entra
// sin choques de código o la migración quedó atrás de la última de main. Y el PR roto de un carril ocupado lo arregla otro, libre.
vi.setConfig({ testTimeout: 60_000 })

let a: Arnes
beforeEach(() => {
  a = conMain()
})
afterEach(() => a.limpiar())

/** El paso publicado en `rama` (con un commit propio en `ruta`) y devuelto por el coordinador con `arreglar`. */
function publicadoYDevuelto(f: string, rama: string, ruta: string, arreglar: string) {
  coordinador(f, 'siguiente', 'formula')
  coordinador(f, 'publicado', '4.99', '7')
  a.git('fetch', '-q', 'origin')
  a.git('checkout', '-q', '-b', rama, 'origin/main')
  a.escribirRepo(ruta, 'de la rama\n')
  a.git('add', '.')
  a.git(...GIT, 'commit', '-q', '-m', 'el paso')
  a.git('push', '-q', 'origin', rama)
  // El carril siguió con otra cosa: su árbol ya no está en la rama del paso.
  a.git('checkout', '-q', '--detach')
  const archivo = join(dirCoord(), 'estado.json')
  const estado = JSON.parse(readFileSync(archivo, 'utf8'))
  estado.pasos['4.99'].arreglar = arreglar
  writeFileSync(archivo, JSON.stringify(estado))
}

describe('carril.sh › remendar sin sesión', () => {
  it('un conflicto que main resuelve sin choques de código se publica sin lanzar el paso', () => {
    const f = plan(paso('4.99'))
    publicadoYDevuelto(f, 'formula/4.99', 'src/f/a.ts', 'conflicto con main')
    integrarEnMain('src/p/otro.ts', 'de main')
    const r = a.correr(['--una-vuelta'], entorno(f))
    expect(r.estado, r.salida).toBe(0)
    expect(a.estado('registro.md')).toContain('4.99 remendado sin sesión (conflicto con main)')
    expect(a.secuencia()).toContain('publicar:4.99')
    expect(a.llamadas('paso')).toHaveLength(0)
    expect(existsSync(join(a.repo, 'src/p/otro.ts'))).toBe(true)
  })

  it('un rojo por la migración atrás de main la renumera (mismo contenido) y se publica sin lanzar el paso', () => {
    const f = plan(paso('4.99'))
    const vieja = 'supabase/migrations/20261108125907_formula_tope.sql'
    publicadoYDevuelto(f, 'formula/4.99', vieja, 'CI en rojo')
    a.escribirRepo('docs/pasos/4.99/bitacora.md', 'creé 20261108125907_formula_tope.sql\n')
    a.git('add', '.')
    a.git(...GIT, 'commit', '-q', '-m', 'docs')
    a.git('push', '-q', 'origin', 'HEAD:formula/4.99')
    a.git('checkout', '-q', '--detach')
    integrarEnMain('supabase/migrations/20261108140007_comprobantes_serie.sql', 'select 1;\n')
    const r = a.correr(['--una-vuelta'], entorno(f))
    expect(r.estado, r.salida).toBe(0)
    expect(a.estado('registro.md')).toContain('renumeré las migraciones de la rama tras main')
    expect(a.estado('registro.md')).toContain('4.99 remendado sin sesión (CI en rojo)')
    expect(a.llamadas('paso')).toHaveLength(0)
    const nuevas = readdirSync(join(a.repo, 'supabase/migrations')).filter((m) =>
      m.endsWith('_formula_tope.sql'),
    )
    expect(nuevas).toHaveLength(1)
    expect(nuevas[0]!.slice(0, 14) > '20261108140007').toBe(true)
    expect(readFileSync(join(a.repo, 'supabase/migrations', nuevas[0]!), 'utf8')).toBe(
      'de la rama\n',
    )
    expect(readFileSync(join(a.repo, 'docs/pasos/4.99/bitacora.md'), 'utf8')).toContain(
      nuevas[0]!.slice(0, 14),
    )
  })

  it('un rojo sin migraciones atrás es un arreglo de verdad: corre la sesión del paso', () => {
    const f = plan(paso('4.99'))
    publicadoYDevuelto(f, 'formula/4.99', 'src/f/a.ts', 'CI en rojo')
    integrarEnMain('src/p/otro.ts', 'de main')
    a.paso(1, pasoListo({ 'src/f/b.ts': 'arreglo' }))
    const r = a.correr(['--una-vuelta'], entorno(f))
    expect(r.estado, r.salida).toBe(0)
    expect(a.estado('registro.md')).not.toContain('remendado sin sesión')
    expect(a.llamadas('paso')).toHaveLength(1)
  })
})

describe('carril.sh › arreglo prestado', () => {
  it('el carril libre toma la rama del PR de un carril ocupado y la publica ahí', () => {
    const f = plan(paso('4.99'), paso('5.01'))
    // formula publicó 4.99 y está ocupado con 5.01; papelera, libre, arregla 4.99 en formula/4.99.
    publicadoYDevuelto(f, 'formula/4.99', 'src/f/a.ts', 'conflicto con main')
    // (Con 4.99 devuelto, el coordinador le daría 4.99 otra vez a formula: el 5.01 se le asigna a mano.)
    const archivo = join(dirCoord(), 'estado.json')
    const estado = JSON.parse(readFileSync(archivo, 'utf8'))
    estado.pasos['5.01'] = { ...estado.pasos['5.01'], estado: 'asignado', carril: 'formula' }
    writeFileSync(archivo, JSON.stringify(estado))
    integrarEnMain('src/p/otro.ts', 'de main')
    const r = a.correr(['--una-vuelta'], entorno(f, { PILOTO_CARRIL: 'papelera' }))
    expect(r.estado, r.salida).toBe(0)
    expect(a.estado('registro.md')).toContain('el coordinador asignó 4.99 en formula/4.99')
    expect(a.estado('registro.md')).toContain('4.99 remendado sin sesión')
    expect(a.llamadas('paso')).toHaveLength(0)
    expect(
      execFileSync('git', ['branch', '--show-current'], { cwd: a.repo, encoding: 'utf8' }).trim(),
    ).toBe('formula/4.99')
  })
})
