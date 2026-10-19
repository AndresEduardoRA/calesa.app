import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  ARCHIVO,
  LARGO_DEL_TITULO,
  MARCA_DE_FIN,
  MARCA_DE_INICIO,
  conIndice,
  entradasDe,
  recortarTitulo,
} from './indice-de-decisiones.mjs'

const doc = (cuerpo: string, indice = '') =>
  [
    '# Decisiones',
    '',
    '## AAAA-MM-DD — <decisión en una línea>',
    '',
    '---',
    '',
    MARCA_DE_INICIO,
    ...(indice === '' ? [] : [indice]),
    MARCA_DE_FIN,
    '',
    cuerpo,
  ].join('\n')

describe('índice de DECISIONES: las entradas', () => {
  it('toma «## fecha — título» con su línea y deja la plantilla afuera', () => {
    const texto = doc('## 2026-10-11 — Stack\n\ntexto\n\n## 2026-10-12 — Nivel 2')
    expect(entradasDe(texto)).toEqual([
      { linea: 10, fecha: '2026-10-11', titulo: 'Stack' },
      { linea: 14, fecha: '2026-10-12', titulo: 'Nivel 2' },
    ])
  })
})

describe('índice de DECISIONES: el título', () => {
  it('un título corto queda igual', () => {
    expect(recortarTitulo('Stack y andamiaje inicial')).toBe('Stack y andamiaje inicial')
  })

  it('uno largo se corta en una palabra, con «…», y cabe', () => {
    const titulo = 'palabra '.repeat(30).trim()
    const recortado = recortarTitulo(titulo)
    expect(recortado.length).toBeLessThanOrEqual(LARGO_DEL_TITULO)
    expect(recortado.endsWith('palabra…')).toBe(true)
  })

  it('no deja un `código` abierto', () => {
    const titulo = `Los avisos no reciben el puntero y el \`logging.serverFunctions\` queda apagado para todo el proyecto, sin excepción`
    const recortado = recortarTitulo(titulo, 60)
    expect((recortado.match(/`/g) ?? []).length % 2).toBe(0)
    expect(recortado.endsWith('…')).toBe(true)
  })
})

describe('índice de DECISIONES: el bloque', () => {
  const cuerpo = '## 2026-10-11 — Stack\n\ntexto\n\n## 2026-10-12 — Nivel 2\n\ntexto'

  // Cada fila «- L<n> · fecha · título» tiene que apuntar a la línea donde está de verdad su encabezado.
  const filasDe = (texto: string) =>
    texto
      .split('\n')
      .map((l) => /^- L(\d+) · (\d{4}-\d{2}-\d{2}) · (.*)$/.exec(l))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => ({ linea: Number(m[1]), fecha: m[2], titulo: m[3] }))

  it('cada línea del índice dice la línea que tiene la entrada con el índice puesto', () => {
    const texto = conIndice(doc(cuerpo))
    const lineas = texto.split('\n')
    const filas = filasDe(texto)
    expect(filas.map((f) => f.titulo)).toEqual(['Stack', 'Nivel 2'])
    for (const f of filas) {
      expect(lineas[f.linea - 1]).toBe(`## ${String(f.fecha)} — ${String(f.titulo)}`)
    }
  })

  it('es idempotente: un índice al día no cambia', () => {
    const una = conIndice(doc(cuerpo))
    expect(conIndice(una)).toBe(una)
  })

  it('reemplaza lo que hubiera en el bloque (un índice viejo, o una línea a mano)', () => {
    const viejo = conIndice(doc(cuerpo, '- L1 · 2020-01-01 · algo que ya no está'))
    expect(viejo).toBe(conIndice(doc(cuerpo)))
    expect(viejo).not.toContain('2020-01-01')
  })

  it('una entrada nueva suma su fila y corre las de abajo (dos líneas más por la fila y una por la de arriba)', () => {
    const antes = filasDe(conIndice(doc(cuerpo)))
    const texto = conIndice(doc(`${cuerpo}\n\n## 2026-10-13 — Otra`))
    const despues = filasDe(texto)
    expect(despues.map((f) => f.titulo)).toEqual(['Stack', 'Nivel 2', 'Otra'])
    expect(despues[0]?.linea).toBe((antes[0]?.linea ?? 0) + 1)
    const lineas = texto.split('\n')
    for (const f of despues) {
      expect(lineas[f.linea - 1]).toBe(`## ${String(f.fecha)} — ${String(f.titulo)}`)
    }
  })

  it('sin las marcas no inventa dónde ponerlo: falla diciendo cuáles faltan', () => {
    expect(() => conIndice('# Decisiones\n\n## 2026-10-11 — Stack\n')).toThrow(/indice:inicio/)
  })
})

describe('índice de DECISIONES: el archivo del repo', () => {
  const texto = readFileSync(ARCHIVO, 'utf8')

  it('el índice está al día (si falla: bash scripts/mapa.sh)', () => {
    expect(conIndice(texto)).toBe(texto)
  })

  it('lleva una línea por entrada y pesa una fracción del archivo', () => {
    const filas = texto.split('\n').filter((l) => /^- L\d+ · \d{4}-\d{2}-\d{2} · /.test(l))
    expect(filas.length).toBe(entradasDe(texto).length)
    expect(filas.join('\n').length).toBeLessThan(texto.length / 8)
  })
})
