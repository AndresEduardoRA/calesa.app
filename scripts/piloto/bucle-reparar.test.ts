import { chmodSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Arnes, pasoListo, responder, RUTEO_BASE } from './bucle.arnes'

// Las paradas que sólo son de entorno (disco, funciones edge, ultimo.json que declara de menos) se arreglan una vez, solas, y se anotan
// en el registro; si no queda arreglado, el aviso sale como siempre (bucle-paradas.test.ts y bucle-cierre.test.ts lo prueban con
// PILOTO_REPARAR=0, el valor del arnés).
vi.setConfig({ testTimeout: 60_000 })

let a: Arnes
beforeEach(() => {
  a = new Arnes()
})
afterEach(() => a.limpiar())

const SOLO = { PILOTO_REPARAR: '1' }

describe('bucle.sh › repara solo el disco', () => {
  it('libera cachés, vuelve a medir y sigue sin avisar', () => {
    const df = join(a.fake, 'bin', 'df')
    writeFileSync(
      df,
      '#!/usr/bin/env bash\nif [ -e "$FAKE_DIR/limpio" ]; then echo "Uso%"; echo " 50%"; else echo "Uso%"; echo " 95%"; fi\n',
    )
    chmodSync(df, 0o755)
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    const r = a.correr(['--una-vuelta'], {
      ...SOLO,
      PILOTO_DISCO_MAX: '90',
      PILOTO_CMD_LIMPIAR: 'touch "$FAKE_DIR/limpio"',
    })
    expect(r.estado, r.salida).toBe(0)
    expect(a.secuencia().some((l) => l.startsWith('decidir:'))).toBe(false)
    expect(r.salida).toContain('reparando solo: el disco está al 95 %')
    expect(r.salida).toContain('disco: 95 % → 50 %')
    expect(a.llamadas('paso')).toHaveLength(1)
  })

  it('si el disco no baja, avisa como siempre', () => {
    a.decidir(1, responder('parado'))
    const r = a.correr([], { ...SOLO, PILOTO_DISCO_MAX: '1', PILOTO_CMD_LIMPIAR: 'true' })
    expect(r.estado).toBe(0)
    expect(a.secuencia()).toEqual(['decidir:abrir parada ', 'decidir:cerrar'])
    expect(r.salida).toContain('reparando solo: el disco')
  })
})

describe('bucle.sh › repara solo las funciones edge', () => {
  const nivel2 = { nivel: 2, disparadores: ['shared'], cuenta_e2e: 1, completo: false }

  it('las levanta y el paso corre sin avisar', () => {
    a.ruteo({ ...RUTEO_BASE, nivel: nivel2 })
    a.caerFunciones('apibara')
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    const r = a.correr(['--una-vuelta'], {
      ...SOLO,
      PILOTO_CMD_FUNCIONES: 'rm -f "$FAKE_DIR/funciones-caidas"',
      PILOTO_POLL_FUNCIONES: '0.1',
    })
    expect(r.estado, r.salida).toBe(0)
    expect(a.secuencia().some((l) => l.startsWith('decidir:'))).toBe(false)
    expect(r.salida).toContain('funciones edge servidas')
    expect(a.llamadas('paso')).toHaveLength(1)
  })

  it('si no quedan servidas, avisa como siempre', () => {
    a.ruteo({ ...RUTEO_BASE, nivel: nivel2 })
    a.caerFunciones('apibara')
    a.decidir(1, responder('parado'))
    const r = a.correr([], {
      ...SOLO,
      PILOTO_CMD_FUNCIONES: 'true',
      PILOTO_ESPERA_FUNCIONES: '2',
      PILOTO_POLL_FUNCIONES: '0.1',
    })
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('paso')).toEqual([])
    expect(a.leerFake('compuerta-1.md')).toContain('faltan las funciones edge (apibara)')
  })
})

describe('bucle.sh › completa ultimo.json cuando declara de menos', () => {
  it('un commit del paso sin listar: lo completa, anota y publica', () => {
    a.paso(
      1,
      pasoListo({ 'src/a.ts': 'a', 'src/b.ts': 'b' }, { unPorArchivo: true, commits: 'ultimo' }),
    )
    const r = a.correr(['--una-vuelta'], SOLO)
    expect(r.estado, r.salida).toBe(0)
    expect(a.secuencia().some((l) => l.startsWith('decidir:'))).toBe(false)
    expect(r.salida).toContain('ultimo.json declaraba 1 commits y el rango tiene 2; lo completé')
    expect(a.secuencia()).toContain('publicar:4.99')
  })

  it('un commit que no existe no se «repara»: avisa', () => {
    a.paso(
      1,
      pasoListo({ 'src/a.ts': 'a' }, { commits: ['1234567890123456789012345678901234567890'] }),
    )
    a.decidir(1, responder('parado'))
    a.correr(['--una-vuelta'], SOLO)
    expect(a.secuencia()).toEqual(['decidir:abrir parada 4.99', 'decidir:cerrar'])
  })
})
