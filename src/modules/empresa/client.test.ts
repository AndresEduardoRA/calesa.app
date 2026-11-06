import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Se lee el texto y no se importa: importar la action traería `composicion` (4.15-6c).
const RAIZ = path.join(process.cwd(), 'src/modules/empresa')
const leer = (ruta: string) => readFileSync(path.join(RAIZ, ruta), 'utf8')
const sinComentarios = (texto: string) =>
  texto
    .split('\n')
    .filter((linea) => !linea.trim().startsWith('//'))
    .join('\n')

describe('empresa/client.ts', () => {
  it('exporta la action del tipo de cambio y el tipo de su entrada, y nada más', () => {
    const exports = [
      ...sinComentarios(leer('client.ts')).matchAll(/export\s+(type\s+)?\{([^}]*)\}/g),
    ]
      .flatMap((m) => (m[2] ?? '').split(','))
      .map((nombre) => nombre.trim())
      .filter(Boolean)
      .sort()
    expect(exports).toEqual(['EntradaDeGuardarTipoCambio', 'guardarTipoCambio'])
  })

  it('la action sale de un archivo `use server` y el tipo, de los esquemas de la feature', () => {
    const texto = sinComentarios(leer('client.ts'))
    const deLaAction = /from '(\.\/features\/tipos-cambio\/actions\/[^']+)'/.exec(texto)?.[1]
    expect(deLaAction).toBeDefined()
    expect(
      sinComentarios(leer(`${deLaAction}.ts`))
        .trimStart()
        .startsWith(`'use server'`),
    ).toBe(true)
    expect(texto).toMatch(/from '\.\/features\/tipos-cambio\/schemas\//)
  })
})
