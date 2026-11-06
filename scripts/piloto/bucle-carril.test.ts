import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Arnes, pasoCompuerta, pasoListo, responder, RUTEO_BASE } from './bucle.arnes'

// Con PILOTO_CARRIL el bucle le pide el paso al coordinador (plan.yaml), saca la rama `<carril>/<paso>` de origin/main y exige que el
// ruteo elija ese paso. Sin paso libre espera; sin más pasos termina.
vi.setConfig({ testTimeout: 60_000 })

let a: Arnes
let comun = ''
beforeEach(() => {
  a = new Arnes()
  const remoto = join(a.raiz, 'remoto.git')
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remoto])
  a.git('remote', 'add', 'origin', remoto)
  a.git('push', '-q', 'origin', 'HEAD:main')
  comun = join(a.raiz, 'coord')
  mkdirSync(comun, { recursive: true })
})
afterEach(() => a.limpiar())

const paso = (id: string, dep: string[], carril = 'formula') => `  - id: "${id}"
    titulo: 'paso ${id}'
    depende_de: [${dep.map((d) => `"${d}"`).join(', ')}]
    carril: ${carril}
    riesgo: verde
    modulos: [src/${carril === 'formula' ? 'f' : 'p'}/, docs/]
    ruteo: {agente: claude, modelo: sonnet, effort: high, modo: auto, sesion: nueva, revisor: ninguno}
    verificacion: 'Nivel 1'
    terminado: 'listo'
`
function plan(...pasos: string[]) {
  const f = join(comun, 'plan.yaml')
  writeFileSync(
    f,
    `esquema: plan/v1\nagentes_disponibles: [claude]\ncarriles:\n  - id: formula\n    dueno_de: [src/f/]\n  - id: papelera\n    dueno_de: [src/p/]\npasos:\n${pasos.join('')}`,
  )
  return f
}
const entorno = (f: string) => ({
  PILOTO_CARRIL: 'formula',
  PILOTO_COORDINADOR: resolve('scripts/coordinador/coordinador.mjs'),
  COORD_PLAN: f,
  COORD_DIR: join(comun, 'estado'),
  COORD_USD_VENTANA: '',
  HOME: a.raiz,
})

describe('bucle.sh › el carril pide su paso al coordinador', () => {
  it('lo asigna, saca su rama de origin/main y corre el paso', () => {
    a.ruteo({ ...RUTEO_BASE, paso: '4.99' })
    a.paso(1, pasoListo({ 'src/f/a.ts': 'a' }))
    const r = a.correr(['--una-vuelta'], entorno(plan(paso('4.99', []))))
    expect(r.estado, r.salida).toBe(0)
    expect(r.salida).toContain('carril formula: el coordinador asignó 4.99 en formula/4.99')
    expect(a.git('symbolic-ref', '--short', 'HEAD')).toBe('formula/4.99')
    expect(existsSync(join(a.repo, '.piloto/asignado.json'))).toBe(true)
    expect(a.llamadas('paso')).toHaveLength(1)
  })

  it('el ruteo lee en hechos.json el paso que el coordinador acaba de asignar', () => {
    a.ruteo({ ...RUTEO_BASE, paso: '4.99' })
    a.paso(1, pasoListo({ 'src/f/a.ts': 'a' }))
    const r = a.correr(['--una-vuelta'], entorno(plan(paso('4.99', []))))
    expect(r.estado, r.salida).toBe(0)
    const hechos = JSON.parse(a.leerFake('hechos-ruteo-1.json')) as {
      asignado: { paso: string } | null
    }
    expect(hechos.asignado?.paso).toBe('4.99')
  })

  it('acepta que el ruteo elija una parte del paso asignado (4.99-2 dentro de 4.99)', () => {
    a.ruteo({ ...RUTEO_BASE, paso: '4.99-2' })
    a.paso(1, pasoListo({ 'src/f/a.ts': 'a' }, { paso: '4.99-2' }))
    const r = a.correr(['--una-vuelta'], entorno(plan(paso('4.99', []))))
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('paso')).toHaveLength(1)
  })

  it('no confunde el 4.9 asignado con el 4.99 elegido (sólo vale la parte con guion)', () => {
    a.ruteo({ ...RUTEO_BASE, paso: '4.99' })
    a.decidir(1, 'exit 0')
    a.correr(['--una-vuelta'], entorno(plan(paso('4.9', []))))
    expect(a.llamadas('paso')).toEqual([])
    expect(a.leerFake('compuerta-1.md')).toContain(
      'el ruteo eligió 4.99, pero el coordinador asignó 4.9',
    )
  })

  it('si el ruteo elige otro paso que el asignado, avisa y no corre nada', () => {
    a.ruteo({ ...RUTEO_BASE, paso: '4.50' })
    a.decidir(1, 'exit 0')
    a.correr(['--una-vuelta'], entorno(plan(paso('4.99', []))))
    expect(a.llamadas('paso')).toEqual([])
    expect(a.leerFake('compuerta-1.md')).toContain(
      'el ruteo eligió 4.50, pero el coordinador asignó 4.99',
    )
  })

  it('sin paso libre (depende de uno que sigue en otro carril) espera, sin gastar', () => {
    const f = plan(paso('4.97', [], 'papelera'), paso('4.98', ['4.97']))
    const r = a.correr(['--una-vuelta'], entorno(f))
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('ruteo')).toEqual([])
    expect(a.llamadas('paso')).toEqual([])
    expect(r.salida).toContain('carril formula: sin paso libre')
  })
})

describe('bucle.sh › una compuerta a la vez entre carriles', () => {
  it('la compuerta espera mientras otro carril tiene la suya abierta', async () => {
    mkdirSync(a.comun, { recursive: true })
    const otro = spawn('flock', [join(a.comun, 'compuerta.lock'), 'sleep', '3'], {
      stdio: 'ignore',
    })
    await new Promise((seguir) => setTimeout(seguir, 300))
    a.paso(1, pasoCompuerta('dependencia'))
    a.decidir(1, responder('parado'))
    const inicio = Date.now()
    const r = a.correr(['--una-vuelta'])
    otro.kill()
    expect(r.estado, r.salida).toBe(0)
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(2000)
    expect(a.secuencia()[0]).toBe('decidir:abrir dependencia 4.99')
  })
})
