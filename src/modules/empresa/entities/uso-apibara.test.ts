import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MENSAJES_DE_USO, codigoDeUso, resumenDeUso, usoDesdeRespuesta } from './uso-apibara'

describe('usoDesdeRespuesta', () => {
  it('lee lo que devuelve la función', () => {
    expect(
      usoDesdeRespuesta({
        plan: 'Test',
        usadas: 60,
        limite: 100,
        restantes: 40,
        hasta: '2026-10-14',
      }),
    ).toEqual({ plan: 'Test', usadas: 60, limite: 100, restantes: 40, hasta: '2026-10-14' })
  })

  it('lo que falta queda en null y una fecha con hora se corta al día', () => {
    expect(usoDesdeRespuesta({ usadas: 3, hasta: '2026-10-14T00:00:00Z' })).toMatchObject({
      plan: null,
      usadas: 3,
      limite: null,
      hasta: '2026-10-14',
    })
  })

  it('algo que no es un objeto no es un uso', () => {
    expect(usoDesdeRespuesta(null)).toBeNull()
    expect(usoDesdeRespuesta('texto')).toBeNull()
  })

  it('entiende lo grabado de la API real a través de la forma que devuelve la función', () => {
    const real = JSON.parse(
      readFileSync(join(process.cwd(), 'e2e/fixtures/apibara/uso.json'), 'utf8'),
    ) as {
      data: { plan: { name: string }; quota: Record<string, number>; period: { quota_to: string } }
    }
    const { plan, quota, period } = real.data
    expect(
      usoDesdeRespuesta({
        plan: plan.name,
        usadas: quota['used'],
        limite: quota['limit'],
        restantes: quota['left'],
        hasta: period.quota_to,
      }),
    ).toMatchObject({ plan: 'Test', usadas: 60, limite: 100, restantes: 40, hasta: '2026-10-14' })
  })
})

describe('resumenDeUso', () => {
  it('dice cuánto lleva, cuánto queda y hasta cuándo vale', () => {
    expect(
      resumenDeUso(
        { plan: 'Test', usadas: 60, limite: 100, restantes: 40, hasta: '2026-10-14' },
        '14 oct 2026',
      ),
    ).toBe('Plan Test: 60 de 100 consultas usadas; quedan 40. La cuota vale hasta el 14 oct 2026.')
  })

  it('con la cuota agotada lo dice, y sin datos no inventa', () => {
    expect(
      resumenDeUso({ plan: null, usadas: 100, limite: 100, restantes: 0, hasta: null }, null),
    ).toBe('100 de 100 consultas usadas; no quedan.')
    expect(
      resumenDeUso({ plan: null, usadas: null, limite: null, restantes: null, hasta: null }, null),
    ).toBe('apibara no informó el uso.')
  })
})

describe('códigos de uso', () => {
  it('un código desconocido es un problema del proveedor', () => {
    expect(codigoDeUso('cuota')).toBe('cuota')
    expect(codigoDeUso('raro')).toBe('proveedor')
    expect(codigoDeUso(null)).toBe('proveedor')
  })

  it('cada mensaje es claro: sin exclamaciones ni voseo', () => {
    for (const mensaje of Object.values(MENSAJES_DE_USO)) {
      expect(mensaje).not.toMatch(/[!¡]/)
      expect(mensaje).not.toMatch(/\b(vos|tenés|podés|usted)\b/i)
    }
  })
})
