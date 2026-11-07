import { describe, expect, it } from 'vitest'
import { avisoDeInestables, marcaDeFecha, sobrantes } from './e2e-fallos'

describe('e2e-fallos', () => {
  it('la carpeta se llama con la fecha y la hora, ordenable', () => {
    expect(marcaDeFecha(new Date('2026-10-18T21:08:30Z'))).toBe('2026-10-18_21-08')
  })

  it('con menos de cinco no sobra ninguna', () => {
    expect(sobrantes(['2026-10-17_21-08', '2026-10-16_04-31'], 5)).toEqual([])
  })

  it('con siete sobran las dos más viejas', () => {
    const siete = [
      '2026-10-19_03-00',
      '2026-10-16_04-31',
      '2026-10-17_21-08',
      '2026-10-16_00-30',
      '2026-10-19_01-00',
      '2026-10-18_03-00',
      '2026-10-19_02-00',
    ]
    expect(sobrantes(siete, 5)).toEqual(['2026-10-16_00-30', '2026-10-16_04-31'])
  })

  it('sin inestables no avisa nada', () => {
    expect(avisoDeInestables([])).toEqual({ anotaciones: [], resumen: '' })
  })

  it('una inestable es una anotación de GitHub en su archivo y línea, y una fila del resumen', () => {
    const r = avisoDeInestables([
      {
        archivo: 'e2e/leads-etiquetas.spec.ts',
        linea: 216,
        titulo: 'agrega una etiqueta',
        proyecto: 'movil',
      },
    ])
    expect(r.anotaciones).toEqual([
      '::warning file=e2e/leads-etiquetas.spec.ts,line=216,title=e2e inestable::agrega una etiqueta (movil) pasó recién al reintentar: tiene una causa que buscar',
    ])
    expect(r.resumen).toContain('### e2e inestables (1)')
    expect(r.resumen).toContain('- `e2e/leads-etiquetas.spec.ts:216` agrega una etiqueta (movil)')
  })
})
