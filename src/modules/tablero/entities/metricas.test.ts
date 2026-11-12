import { describe, expect, it } from 'vitest'
import { esquemaDeMetricasDeCotizaciones, esquemaDeMetricasDeLeads } from './metricas'

const DE_LEADS = {
  desde: '2026-11-01',
  hasta: '2026-11-02',
  zona: 'America/La_Paz',
  creados: 3,
  convertidos: 1,
  tasa: 0.3333,
  conversion_desde: '2026-11-10T12:00:00+00:00',
  por_dia: [
    { dia: '2026-11-01', creados: 2, convertidos: 0 },
    { dia: '2026-11-02', creados: 1, convertidos: 1 },
  ],
  por_origen: [{ origen_lead_id: null, nombre: null, creados: 3, convertidos: 1 }],
  por_origen_hay_mas: false,
  por_asesor: [],
  por_asesor_hay_mas: false,
}

describe('esquemaDeMetricasDeLeads', () => {
  it('acepta la forma de la RPC, con «sin origen» y la tasa nula', () => {
    expect(esquemaDeMetricasDeLeads.safeParse(DE_LEADS).success).toBe(true)
    const vacio = { ...DE_LEADS, creados: 0, convertidos: 0, tasa: null, conversion_desde: null }
    expect(esquemaDeMetricasDeLeads.safeParse(vacio).success).toBe(true)
  })

  it('una forma inesperada no pasa', () => {
    expect(esquemaDeMetricasDeLeads.safeParse({ ...DE_LEADS, creados: '3' }).success).toBe(false)
    expect(esquemaDeMetricasDeLeads.safeParse({ ...DE_LEADS, por_dia: null }).success).toBe(false)
    expect(esquemaDeMetricasDeLeads.safeParse(null).success).toBe(false)
  })
})

describe('esquemaDeMetricasDeCotizaciones', () => {
  it('acepta la forma de la RPC y rechaza lo que no es', () => {
    const buena = {
      desde: '2026-11-01',
      hasta: '2026-11-02',
      zona: 'America/La_Paz',
      creadas: 2,
      finales: 1,
      por_dia: [{ dia: '2026-11-01', creadas: 2, finales: 1 }],
      por_origen: [],
      por_origen_hay_mas: false,
    }
    expect(esquemaDeMetricasDeCotizaciones.safeParse(buena).success).toBe(true)
    expect(esquemaDeMetricasDeCotizaciones.safeParse({ ...buena, finales: -1 }).success).toBe(false)
  })
})
