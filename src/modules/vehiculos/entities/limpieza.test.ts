import { describe, expect, it } from 'vitest'
import {
  VENTANA_DE_AVISO_DIAS,
  avisoDeLimpieza,
  hoyEnZona,
  limiteDeAviso,
  limpiezaDesdeRespuesta,
  resumenDeUltimaLimpieza,
  seLimpiaPronto,
  textoDeAviso,
  ultimaLimpiezaDesde,
  type LimpiezaDeVehiculo,
} from './limpieza'

const base = {
  aplica: true,
  activa: true,
  diasGracia: 7,
  fecha: null,
  conservado: false,
  conservadoPorNombre: null,
  conservadoEn: null,
  conservadoPorMi: false,
} satisfies LimpiezaDeVehiculo

const respuesta = {
  aplica: true,
  activa: true,
  dias_gracia: 7,
  fecha: '2026-10-20',
  conservado: false,
  conservado_por_nombre: null,
  conservado_en: null,
  conservado_por_mi: false,
}

describe('limpiezaDesdeRespuesta', () => {
  it('lee lo que dice la base', () => {
    expect(limpiezaDesdeRespuesta(respuesta)).toEqual({ ...base, fecha: '2026-10-20' })
    expect(limpiezaDesdeRespuesta({ aplica: false })).toEqual({ aplica: false })
  })

  it('lo que no entiende no se dibuja', () => {
    expect(limpiezaDesdeRespuesta(null)).toBeNull()
    expect(limpiezaDesdeRespuesta({ aplica: true })).toBeNull()
    expect(limpiezaDesdeRespuesta({ ...respuesta, fecha: '20/10/2026' })).toBeNull()
  })
})

describe('ventana de aviso', () => {
  it('son los próximos 3 días, hoy incluido', () => {
    expect(VENTANA_DE_AVISO_DIAS).toBe(3)
    expect(limiteDeAviso('2026-10-14')).toBe('2026-10-17')
    expect(seLimpiaPronto('2026-10-14', '2026-10-14')).toBe(true)
    expect(seLimpiaPronto('2026-10-17', '2026-10-14')).toBe(true)
    expect(seLimpiaPronto('2026-10-18', '2026-10-14')).toBe(false)
    expect(seLimpiaPronto(null, '2026-10-14')).toBe(false)
  })

  it('una fecha ya pasada también es pronto (la base la dice como la próxima corrida)', () => {
    expect(seLimpiaPronto('2026-10-10', '2026-10-14')).toBe(true)
  })

  it('«hoy» es el de la zona de la empresa, no el del proceso', () => {
    const ahora = new Date('2026-10-15T02:00:00Z')
    expect(hoyEnZona('America/La_Paz', ahora)).toBe('2026-10-14')
    expect(hoyEnZona('UTC', ahora)).toBe('2026-10-15')
  })
})

describe('avisoDeLimpieza', () => {
  const hoy = '2026-10-14'
  const zona = 'America/La_Paz'

  it('no dice nada si no aplica, está apagada o no hay fecha', () => {
    expect(avisoDeLimpieza(null, hoy, zona).tipo).toBe('oculto')
    expect(avisoDeLimpieza({ aplica: false }, hoy, zona).tipo).toBe('oculto')
    expect(avisoDeLimpieza({ ...base, activa: false, fecha: '2026-10-15' }, hoy, zona).tipo).toBe(
      'oculto',
    )
    expect(avisoDeLimpieza(base, hoy, zona).tipo).toBe('oculto')
  })

  it('apagada tampoco dice «se conserva»: desaparecen los banners', () => {
    expect(avisoDeLimpieza({ ...base, activa: false, conservado: true }, hoy, zona).tipo).toBe(
      'oculto',
    )
  })

  it('pronto o lejos según la ventana', () => {
    expect(avisoDeLimpieza({ ...base, fecha: '2026-10-16' }, hoy, zona)).toEqual({
      tipo: 'pronto',
      dia: '2026-10-16',
    })
    expect(avisoDeLimpieza({ ...base, fecha: '2026-10-25' }, hoy, zona)).toEqual({
      tipo: 'lejos',
      dia: '2026-10-25',
    })
  })

  it('conservado dice quién y cuándo, en la zona de la empresa', () => {
    const aviso = avisoDeLimpieza(
      {
        ...base,
        conservado: true,
        conservadoPorNombre: 'Irene',
        conservadoEn: '2026-10-14T02:30:00Z',
      },
      hoy,
      zona,
    )
    expect(aviso).toEqual({ tipo: 'conservado', quien: 'Irene', dia: '2026-10-13' })
    expect(
      avisoDeLimpieza({ ...base, conservado: true, conservadoPorMi: true }, hoy, zona),
    ).toEqual({ tipo: 'conservado', quien: 'ti', dia: null })
  })
})

describe('textoDeAviso', () => {
  it('«Se limpiará el dd/mm»', () => {
    expect(textoDeAviso({ tipo: 'pronto', dia: '2026-10-16' })).toBe('Se limpiará el 16/10')
    expect(textoDeAviso({ tipo: 'lejos', dia: '2026-10-25' })).toBe(
      'Si nadie lo usa, se limpiará el 25/10',
    )
    expect(textoDeAviso({ tipo: 'oculto' })).toBe('')
  })

  it('conservado, con o sin quien lo marcó', () => {
    expect(textoDeAviso({ tipo: 'conservado', quien: 'Irene', dia: '2026-10-13' })).toBe(
      'Se conserva · lo marcó Irene el 13/10',
    )
    expect(textoDeAviso({ tipo: 'conservado', quien: 'ti', dia: '2026-10-14' })).toBe(
      'Se conserva · lo marcaste tú el 14/10',
    )
    expect(textoDeAviso({ tipo: 'conservado', quien: null, dia: null })).toBe('Se conserva')
  })

  it('nunca habla de vos', () => {
    expect(textoDeAviso({ tipo: 'conservado', quien: 'ti', dia: null })).not.toMatch(/\bvos\b/i)
  })
})

describe('la última noche', () => {
  it('lee la corrida y la cuenta entera', () => {
    const ultima = ultimaLimpiezaDesde({
      fecha: '2026-10-14',
      movidos: 12,
      saltados: { vinculo: 2, conservar: 1 },
      pendientes: 0,
    })
    expect(ultima).not.toBeNull()
    expect(resumenDeUltimaLimpieza(ultima!)).toBe(
      'Última limpieza automática: 14/10 · 12 a la papelera · 3 se quedaron (2 vinculados a un lead, 1 marcado para conservar)',
    )
  })

  it('una noche sin nada que mover', () => {
    expect(
      resumenDeUltimaLimpieza({ fecha: '2026-10-14', movidos: 0, saltados: {}, pendientes: 0 }),
    ).toBe('Última limpieza automática: 14/10 · no mandó nada a la papelera')
  })

  it('lo que sobró del tope se dice', () => {
    expect(
      resumenDeUltimaLimpieza({ fecha: '2026-10-14', movidos: 200, saltados: {}, pendientes: 35 }),
    ).toBe(
      'Última limpieza automática: 14/10 · 200 a la papelera · 35 esperan a la noche siguiente',
    )
  })

  it('una respuesta rota no se dibuja', () => {
    expect(ultimaLimpiezaDesde({ fecha: 'ayer' })).toBeNull()
    expect(ultimaLimpiezaDesde(null)).toBeNull()
  })
})
