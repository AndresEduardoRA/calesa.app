import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Arnes, pasoListo, responder } from './bucle.arnes'

// El cierre de un paso «listo»: el modelo nunca publica. El bucle, en bash y fuera de toda sesión, en este orden: a) el árbol limpio y
// cada commit de ultimo.json en `HEAD de arranque..HEAD`; c) la compuerta «guardas» si el rango toca una; b) `verificar.sh` de la
// copia; d) `publicar.sh` de la copia. Cualquier falla en a), b) o d) es un aviso y no publica.
vi.setConfig({ testTimeout: 60_000 })

let a: Arnes
beforeEach(() => {
  a = new Arnes()
})
afterEach(() => a.limpiar())

/** Corre un paso que deja `listo` y, si hay un aviso, la persona responde «parado». */
function correrListo(guion: string, entorno: Record<string, string> = {}) {
  a.paso(1, guion)
  a.decidir(1, responder('parado'))
  return a.correr(['--una-vuelta'], entorno)
}

describe('bucle.sh › a) los commits son los que dice ultimo.json', () => {
  it.each([
    [
      'un commit que no existe',
      { 'src/a.ts': 'a' },
      { commits: ['1234567890123456789012345678901234567890'] },
    ],
    ['listo sin commits', { 'src/a.ts': 'a' }, { commits: 'ninguno' as const }],
    [
      'un commit del paso sin listar',
      { 'src/a.ts': 'a', 'src/b.ts': 'b' },
      { unPorArchivo: true, commits: 'ultimo' as const },
    ],
    ['el árbol sucio', { 'src/a.ts': 'a' }, { sucio: true }],
  ])('%s: aviso y no publica', (_nombre, archivos, opciones) => {
    const r = correrListo(pasoListo(archivos, opciones))
    expect(r.estado, r.salida).toBe(0)
    expect(a.secuencia()).toEqual(['decidir:abrir parada 4.99', 'decidir:cerrar'])
  })

  it('el aviso dice por qué', () => {
    correrListo(
      pasoListo({ 'src/a.ts': 'a' }, { commits: ['1234567890123456789012345678901234567890'] }),
    )
    expect(a.leerFake('compuerta-1.md')).toMatch(
      /motivo: los commits de ultimo.json no coinciden con el repo: el commit 1234567890/,
    )
  })

  it('con un commit que no existe y un archivo de guardas, la compuerta de guardas ni se pregunta: a) va antes que c)', () => {
    correrListo(
      pasoListo(
        { '.claude/hooks/nuevo.sh': '#!/bin/bash' },
        { commits: ['1234567890123456789012345678901234567890'] },
      ),
    )
    expect(a.secuencia()).toEqual(['decidir:abrir parada 4.99', 'decidir:cerrar'])
  })

  it('el paso queda en estado «listo» para reintentar el cierre en la vuelta siguiente', () => {
    correrListo(pasoListo({ 'src/a.ts': 'a' }, { sucio: true }))
    expect(JSON.parse(a.estado('en-curso.json'))).toMatchObject({ paso: '4.99', estado: 'listo' })
  })
})

describe('bucle.sh › b) la verificación es del bucle, y d) la publicación', () => {
  it('verificar rojo: aviso y no publica', () => {
    const r = correrListo(pasoListo({ 'src/a.ts': 'a' }), { FAKE_VERIFICAR_FALLA: '1' })
    expect(r.estado, r.salida).toBe(0)
    expect(a.secuencia()).toEqual([
      'verificar:copia',
      'decidir:abrir parada 4.99',
      'decidir:cerrar',
    ])
    expect(a.leerFake('compuerta-1.md')).toContain(
      'la verificación del bucle falló en 4.99: verificar: lint falló',
    )
  })

  it('publicar rojo (el CI, una divergencia): aviso', () => {
    correrListo(pasoListo({ 'src/a.ts': 'a' }), { FAKE_PUBLICAR_FALLA: '1' })
    expect(a.secuencia()).toEqual([
      'verificar:copia',
      'publicar:4.99',
      'decidir:abrir parada 4.99',
      'decidir:cerrar',
    ])
    expect(a.leerFake('compuerta-1.md')).toContain('no se pudo publicar 4.99: publicar: CI rojo')
  })

  it('tras un aviso de verificación, la vuelta siguiente reintenta el cierre sin llamar al modelo', () => {
    correrListo(pasoListo({ 'src/a.ts': 'a' }), { FAKE_VERIFICAR_FALLA: '1' })
    const r = a.correr(['--una-vuelta'])
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('paso')).toHaveLength(1)
    expect(a.secuencia().slice(-2)).toEqual(['verificar:copia', 'publicar:4.99'])
    expect(existsSync(join(a.repo, '.piloto/en-curso.json'))).toBe(false)
  })

  it('el bucle nunca ejecuta lo que el paso dejó en scripts/piloto/ del árbol', () => {
    a.paso(1, pasoListo({ 'docs/x.md': 'x' }))
    a.correr(['--una-vuelta'])
    expect(existsSync(join(a.fake, 'repo-ejecutado'))).toBe(false)
  })
})

const GUARDAS = [
  'scripts/piloto/verificar.sh',
  'scripts/guardas/ajustes.test.ts',
  'scripts/candado.sh',
  '.claude/settings.json',
  '.claude/settings.local.json',
  '.claude/hooks/bloquear-peligrosos.sh',
  '.claude/agents/auditor.md',
  '.claude/skills/piloto/SKILL.md',
  '.claude/skills/piloto-decidir/SKILL.md',
  'lefthook.yml',
  '.github/workflows/ci.yml',
]

describe('bucle.sh › c) la compuerta «guardas»', () => {
  it.each(GUARDAS)('un paso que toca %s la pregunta antes de verificar', (ruta) => {
    a.paso(1, pasoListo({ [ruta]: 'nuevo' }))
    a.decidir(1, responder('parar'))
    const r = a.correr(['--una-vuelta'])
    expect(r.estado, r.salida).toBe(0)
    expect(a.secuencia()).toEqual(['decidir:abrir guardas 4.99', 'decidir:cerrar'])
    expect(a.leerFake('compuerta-1.md')).toContain(`- ${ruta}`)
  })

  it.each([
    [
      'db:reset',
      (j: Record<string, Record<string, string>>) => ({
        ...j,
        scripts: { ...j['scripts'], 'db:reset': 'bash scripts/candado.sh x -- supabase db reset' },
      }),
    ],
    [
      'db:nuevo',
      (j: Record<string, Record<string, string>>) => ({
        ...j,
        scripts: { ...j['scripts'], 'db:nuevo': 'echo' },
      }),
    ],
    [
      'test:e2e',
      (j: Record<string, Record<string, string>>) => ({
        ...j,
        scripts: { ...j['scripts'], 'test:e2e': 'echo' },
      }),
    ],
  ])('una línea %s de package.json es una guarda', (_nombre, cambiar) => {
    const original = JSON.parse(a.git('show', 'HEAD:package.json')) as Record<
      string,
      Record<string, string>
    >
    a.paso(1, pasoListo({ 'package.json': JSON.stringify(cambiar(original), null, 2) + '\n' }))
    a.decidir(1, responder('parar'))
    a.correr(['--una-vuelta'])
    expect(a.secuencia()[0]).toBe('decidir:abrir guardas 4.99')
  })

  it('otro script de package.json (dev) no es una guarda', () => {
    const original = JSON.parse(a.git('show', 'HEAD:package.json')) as {
      scripts: Record<string, string>
    }
    original.scripts['dev'] = 'next dev --turbo'
    a.paso(1, pasoListo({ 'package.json': JSON.stringify(original, null, 2) + '\n' }))
    a.correr(['--una-vuelta'])
    expect(a.secuencia()).toEqual(['verificar:copia', 'publicar:4.99'])
  })

  it('aprobada, sigue con a) → c) → b) → d), en ese orden', () => {
    a.paso(1, pasoListo({ '.claude/hooks/nuevo.sh': '#!/bin/bash' }))
    a.decidir(1, responder('aprobar'))
    const r = a.correr(['--una-vuelta'])
    expect(r.estado, r.salida).toBe(0)
    expect(a.secuencia()).toEqual([
      'decidir:abrir guardas 4.99',
      'decidir:cerrar',
      'verificar:copia',
      'publicar:4.99',
    ])
  })

  it('«parar» no verifica ni publica', () => {
    a.paso(1, pasoListo({ '.claude/hooks/nuevo.sh': '#!/bin/bash' }))
    a.decidir(1, responder('parar'))
    a.correr(['--una-vuelta'])
    expect(a.secuencia()).not.toContain('verificar:copia')
    expect(a.secuencia()).not.toContain('publicar:4.99')
  })
})
