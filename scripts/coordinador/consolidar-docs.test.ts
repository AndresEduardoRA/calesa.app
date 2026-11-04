import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cuentaE2e } from '../piloto/cuenta-e2e.mjs'
import { consolidar, pasosEnOrden, textoParaLaCuenta } from './consolidar-docs.mjs'

// Con carriles, un paso escribe docs/pasos/<paso>/{bitacora,decisiones}.md y el carril base los pasa a BITACORA y DECISIONES una sola
// vez y en el orden del plan; la cuenta de e2e completo ve también lo que aún no se pasó.
const plan = { pasos: [{ id: '4.20' }, { id: '4.24' }, { id: '4.21' }] }
let raiz = ''
const escribir = (ruta: string, texto: string) => {
  mkdirSync(join(raiz, ruta, '..'), { recursive: true })
  writeFileSync(join(raiz, ruta), texto)
}
const leer = (ruta: string) => readFileSync(join(raiz, ruta), 'utf8')

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'docs-pasos-'))
  escribir('docs/BITACORA.md', '# Bitácora\n\ne2e completo: no (4.19, pantalla, 1 de 3)\n')
  escribir('docs/DECISIONES.md', '# Decisiones\n')
  escribir(
    'docs/pasos/4.24/bitacora.md',
    'Papelera hecha.\ne2e completo: no (4.24, pantalla, 2 de 3)\n',
  )
  escribir('docs/pasos/4.20/bitacora.md', 'Fórmula hecha.\n')
  escribir('docs/pasos/4.20/decisiones.md', '- La fórmula publica con nota.\n')
})
afterEach(() => rmSync(raiz, { recursive: true, force: true }))

describe('consolidar-docs.mjs', () => {
  it('ordena los pasos como el plan y deja al final los que el plan no conoce', () => {
    escribir('docs/pasos/9.99/bitacora.md', 'x')
    expect(pasosEnOrden(raiz, plan)).toEqual(['4.20', '4.24', '9.99'])
  })

  it('pasa lo pendiente con su marca, en el orden del plan, y una segunda vez no repite nada', () => {
    const r = consolidar(raiz, plan)
    expect(r['docs/BITACORA.md']).toEqual(['4.20', '4.24'])
    expect(r['docs/DECISIONES.md']).toEqual(['4.20'])
    const b = leer('docs/BITACORA.md')
    expect(b.indexOf('<!-- paso:4.20 -->')).toBeLessThan(b.indexOf('<!-- paso:4.24 -->'))
    expect(leer('docs/DECISIONES.md')).toContain('La fórmula publica con nota.')
    const antes = [leer('docs/BITACORA.md'), leer('docs/DECISIONES.md')]
    expect(consolidar(raiz, plan)).toEqual({ 'docs/BITACORA.md': [], 'docs/DECISIONES.md': [] })
    expect([leer('docs/BITACORA.md'), leer('docs/DECISIONES.md')]).toEqual(antes)
  })

  it('en seco no escribe', () => {
    const antes = leer('docs/BITACORA.md')
    expect(consolidar(raiz, plan, { enSeco: true })['docs/BITACORA.md']).toEqual(['4.20', '4.24'])
    expect(leer('docs/BITACORA.md')).toBe(antes)
  })

  it('la cuenta de e2e completo ve lo pendiente de los carriles y no lo cuenta dos veces tras pasarlo', () => {
    expect(cuentaE2e(textoParaLaCuenta(raiz, plan)).n).toBe(2)
    consolidar(raiz, plan)
    expect(cuentaE2e(textoParaLaCuenta(raiz, plan)).n).toBe(2)
  })
})
