import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fechasDeEntradas, hoyEnLaPaz, problemasDeFechas } from './fechas-de-entradas.mjs'

describe('fechas de las entradas: qué es una entrada', () => {
  it('DECISIONES lleva «## fecha — título» y la plantilla no cuenta', () => {
    const texto = [
      '# Decisiones',
      '## AAAA-MM-DD — <decisión en una línea>',
      '## 2026-10-11 — Stack',
      'texto con 2026-10-12 adentro',
      '## 2026-10-12 — Nivel 2',
    ].join('\n')
    expect(fechasDeEntradas(texto, 'decisiones')).toEqual([
      { linea: 3, fecha: '2026-10-11' },
      { linea: 5, fecha: '2026-10-12' },
    ])
  })

  it('BITACORA lleva «fecha — …» al principio de la línea y una fecha a mitad de línea no cuenta', () => {
    const texto = [
      '# Bitácora',
      '2026-10-12 — fase 1, parte 3',
      'sigue el texto de la entrada, la carpeta e2e-fallos/2026-10-17_21-08/ no es una entrada',
      '2026-10-13 — fase 2',
      '## 2026-10-28 — Preparación para Orca',
    ].join('\n')
    expect(fechasDeEntradas(texto, 'bitacora')).toEqual([
      { linea: 2, fecha: '2026-10-12' },
      { linea: 4, fecha: '2026-10-13' },
      { linea: 5, fecha: '2026-10-28' },
    ])
  })
})

describe('fechas de las entradas: lo que se rechaza', () => {
  const entradas = (...fechas: string[]) => fechas.map((fecha, i) => ({ linea: i + 1, fecha }))

  it('acepta fechas en orden, repetidas y la de hoy', () => {
    expect(
      problemasDeFechas(
        entradas('2026-10-11', '2026-10-11', '2026-10-15', '2026-10-18'),
        '2026-10-18',
      ),
    ).toEqual([])
  })

  it('rechaza una fecha de mañana en adelante, aunque esté en orden', () => {
    const problemas = problemasDeFechas(entradas('2026-10-17', '2026-10-19'), '2026-10-18')
    expect(problemas).toHaveLength(1)
    expect(problemas[0]).toMatchObject({ linea: 2, fecha: '2026-10-19' })
    expect(problemas[0]?.motivo).toContain('posterior a hoy (2026-10-18)')
  })

  it('rechaza una fecha más vieja que la de la entrada de arriba y dice cuál es', () => {
    const problemas = problemasDeFechas(
      entradas('2026-10-16', '2026-10-17', '2026-10-15'),
      '2026-10-18',
    )
    expect(problemas).toHaveLength(1)
    expect(problemas[0]).toMatchObject({ linea: 3, fecha: '2026-10-15' })
    expect(problemas[0]?.motivo).toContain('línea 2')
  })

  it('una entrada adelantada se señala a sí misma y no a las que le siguen en orden', () => {
    // 10-20 es de mañana en adelante; la que le sigue (10-18, en orden con la de arriba) no se señala por culpa de ella.
    const problemas = problemasDeFechas(
      entradas('2026-10-17', '2026-10-20', '2026-10-18'),
      '2026-10-18',
    )
    expect(problemas.map((p) => p.linea)).toEqual([2])
  })
})

describe('fechas de las entradas: el día de hoy es el de La Paz', () => {
  it('a las 02:00 UTC todavía es el día anterior (UTC-4)', () => {
    expect(hoyEnLaPaz(new Date('2026-10-19T02:00:00Z'))).toBe('2026-10-18')
    expect(hoyEnLaPaz(new Date('2026-10-19T04:00:00Z'))).toBe('2026-10-19')
  })
})

describe('fechas de las entradas: los docs del repo', () => {
  // Los vivos empiezan cortos (docs/PREPARACION.md, etapa 3); las copias de docs/archivo/ son las completas, congeladas.
  it.each([
    ['docs/DECISIONES.md', 'decisiones', 1],
    ['docs/BITACORA.md', 'bitacora', 1],
    ['docs/archivo/DECISIONES.md', 'decisiones', 20],
    ['docs/archivo/BITACORA.md', 'bitacora', 20],
  ] as const)(
    '%s: todas las entradas tienen fecha de hoy o anterior y van en orden',
    (archivo, formato, minimo) => {
      const entradas = fechasDeEntradas(readFileSync(archivo, 'utf8'), formato)
      expect(entradas.length).toBeGreaterThanOrEqual(minimo)
      expect(problemasDeFechas(entradas, hoyEnLaPaz())).toEqual([])
    },
  )
})
