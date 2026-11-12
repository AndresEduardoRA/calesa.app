import { readFileSync, writeFileSync } from 'node:fs'
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

// Los registros donde cada carril agrega su línea (carreras, presupuestos, pruebas SQL compartidas, guardas) chocaban con main una y
// otra vez (8 al 11-11-2026): con puros agregados de los dos lados se unen sin sesión, como las notas de docs/.
vi.setConfig({ testTimeout: 60_000 })

let a: Arnes
beforeEach(() => {
  a = conMain()
})
afterEach(() => a.limpiar())

const RAMA = 'formula/4.99'
const REGISTRO = 'scripts/carreras.mjs'
const lista = (...lineas: string[]) =>
  `export const carreras = [\n${lineas.map((l) => `  ${l},\n`).join('')}]\n`

/** El paso publicado y devuelto por conflicto, con `ruta` cambiada en la rama y en main desde `base`. */
function choqueEn(ruta: string, f: string, [base, deLaRama, deMain]: [string, string, string]) {
  integrarEnMain(ruta, base)
  coordinador(f, 'siguiente', 'formula')
  coordinador(f, 'publicado', '4.99', '7')
  a.git('fetch', '-q', 'origin')
  a.git('checkout', '-q', '-b', RAMA, 'origin/main')
  a.escribirRepo(ruta, deLaRama)
  a.git('add', '.')
  a.git(...GIT, 'commit', '-q', '-m', 'lo de la rama')
  a.git('push', '-q', 'origin', RAMA)
  a.git('checkout', '-q', '--detach')
  const archivo = join(dirCoord(), 'estado.json')
  const estado = JSON.parse(readFileSync(archivo, 'utf8'))
  estado.pasos['4.99'].arreglar = 'conflicto con main'
  writeFileSync(archivo, JSON.stringify(estado))
  integrarEnMain(ruta, deMain)
}
const correr = (f: string) => {
  a.paso(1, pasoListo({ 'src/f/b.ts': 'x' }))
  const r = a.correr(['--una-vuelta'], entorno(f))
  expect(r.estado, r.salida).toBe(0)
}

describe('carril.sh › unir los registros sin sesión', () => {
  it('los dos lados sólo agregaron su línea: se une y se publica sin sesión', () => {
    const f = plan(paso('4.99'))
    choqueEn(REGISTRO, f, [lista("'a'"), lista("'a'", "'rama'"), lista("'a'", "'main'")])
    correr(f)
    expect(a.estado('registro.md')).toContain('4.99 remendado sin sesión')
    expect(a.llamadas('paso')).toHaveLength(0)
    const unido = readFileSync(join(a.repo, REGISTRO), 'utf8')
    expect(unido).toContain("'rama',")
    expect(unido).toContain("'main',")
  })

  it('los dos cambiaron la misma línea: no se une, va a la sesión', () => {
    const f = plan(paso('4.99'))
    choqueEn(REGISTRO, f, [lista("'a'"), lista("'de la rama'"), lista("'de main'")])
    correr(f)
    expect(a.estado('registro.md')).not.toContain('remendado sin sesión')
    expect(a.estado('registro.md')).toContain(`choca: ${REGISTRO}`)
    expect(a.llamadas('paso')).toHaveLength(1)
  })

  it('un .mjs que unido no es JavaScript válido no se une: va a la sesión', () => {
    const f = plan(paso('4.99'))
    const base = 'export const a = 1\n'
    choqueEn(REGISTRO, f, [base, `${base}const x = {\n`, `${base}export const b = [\n`])
    correr(f)
    expect(a.estado('registro.md')).not.toContain('remendado sin sesión')
    expect(a.llamadas('paso')).toHaveLength(1)
  })

  it('un código que no es un registro no se une aunque sean puros agregados', () => {
    const f = plan(paso('4.99'))
    choqueEn('src/f/lista.ts', f, [lista("'a'"), lista("'a'", "'rama'"), lista("'a'", "'main'")])
    correr(f)
    expect(a.estado('registro.md')).not.toContain('remendado sin sesión')
    expect(a.llamadas('paso')).toHaveLength(1)
  })

  it('la ficha CLAUDE.md de una unidad se une como las notas de docs/', () => {
    const f = plan(paso('4.99'))
    choqueEn('src/modules/x/CLAUDE.md', f, ['# x\n', '# x\n\n- rama\n', '# x\n\n- main\n'])
    correr(f)
    expect(a.estado('registro.md')).toContain('4.99 remendado sin sesión')
    expect(a.llamadas('paso')).toHaveLength(0)
  })
})
