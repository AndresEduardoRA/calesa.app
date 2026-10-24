import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CONTRASTE_AA, contraste } from '@/shared/lib/color'
import { corpusComoTexto, generarCorpus } from './corpus-de-contraste'

const CORPUS = 'supabase/tests/corpus-de-contraste.json'
const REGENERAR = 'ACTUALIZAR_CORPUS=1 pnpm vitest run supabase/tests/corpus-de-contraste.test.ts'

describe('corpus de contraste', () => {
  it('el archivo es el que genera color.ts', () => {
    if (process.env['ACTUALIZAR_CORPUS'] === '1') writeFileSync(CORPUS, corpusComoTexto())
    expect(existsSync(CORPUS), `falta el corpus: ${REGENERAR}`).toBe(true)
    expect(readFileSync(CORPUS, 'utf8'), `corpus viejo: ${REGENERAR}`).toBe(corpusComoTexto())
  })

  it('trae pares de los dos lados del umbral y la semilla pasa AA en claro y en oscuro', () => {
    const { pares, tonos } = generarCorpus()
    expect(pares.length).toBeGreaterThanOrEqual(300)
    expect(pares.some((p) => p.aa)).toBe(true)
    expect(pares.some((p) => !p.aa)).toBe(true)
    for (const t of tonos) {
      expect(contraste(t.claro.tinta, t.claro.fondo)).toBeGreaterThanOrEqual(CONTRASTE_AA)
      expect(contraste(t.oscuro.tinta, t.oscuro.fondo)).toBeGreaterThanOrEqual(CONTRASTE_AA)
    }
  })
})
