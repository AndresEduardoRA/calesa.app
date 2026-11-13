import { describe, expect, it } from 'vitest'
import {
  esquemaDeColaWeb,
  esquemaDeMargenDelMes,
  esquemaDeMetricasDeCotizaciones,
  esquemaDeMetricasDeLeads,
} from './metricas'

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

// La forma de R1 de `supabase/tests/areas/tablero/margen-y-cola.sql` (9.11-1): dos vehículos, dos orígenes.
const DE_MARGEN = {
  desde: '2026-11-01',
  hasta: '2026-11-30',
  zona: 'America/La_Paz',
  moneda: 'USD',
  vehiculos: 2,
  venta: 3044.55,
  real: 1948.54,
  cotizado: 2900,
  margen: 1096.01,
  sin_venta: 1,
  por_origen: [
    {
      origen_id: '7b0e1f6a-2c3d-4e5f-8a9b-0c1d2e3f4a5b',
      nombre: 'Japón',
      vehiculos: 1,
      venta: 2000,
      real: 1200.5,
      cotizado: 1900,
      margen: 799.5,
      sin_venta: 0,
    },
    {
      origen_id: '8c1f2a7b-3d4e-4f60-9bac-1d2e3f4a5b6c',
      nombre: 'Chile',
      vehiculos: 1,
      venta: 1044.55,
      real: 748.04,
      cotizado: 1000,
      margen: 296.51,
      sin_venta: 1,
    },
  ],
  por_origen_hay_mas: false,
}

describe('esquemaDeMargenDelMes', () => {
  it('acepta la forma de la RPC, sin ventas (montos nulos) y un margen negativo', () => {
    expect(esquemaDeMargenDelMes.safeParse(DE_MARGEN).success).toBe(true)
    const sinVentas = {
      ...DE_MARGEN,
      vehiculos: 0,
      venta: null,
      real: null,
      cotizado: null,
      margen: null,
      sin_venta: 0,
      por_origen: [],
    }
    expect(esquemaDeMargenDelMes.safeParse(sinVentas).success).toBe(true)
    expect(esquemaDeMargenDelMes.safeParse({ ...DE_MARGEN, margen: -250.75 }).success).toBe(true)
  })

  it('un monto en texto o una respuesta sin moneda no pasan', () => {
    expect(esquemaDeMargenDelMes.safeParse({ ...DE_MARGEN, venta: '3044.55' }).success).toBe(false)
    const { moneda: _moneda, ...sinMoneda } = DE_MARGEN
    expect(esquemaDeMargenDelMes.safeParse(sinMoneda).success).toBe(false)
  })
})

// La forma de R6 (con turnos) y R7 (vacía) de `cola-web.sql`.
const POR_ESTADO = { asignada: 1, contactada: 2, vencida: 0, sin_asignar: 1, cancelada: 0 }
const DE_COLA = {
  desde: '2026-11-01',
  hasta: '2026-11-30',
  zona: 'America/La_Paz',
  total: 4,
  por_estado: POR_ESTADO,
  directas: 1,
  asignadas: 4,
  contactadas: 2,
  tasa: 0.5,
  mediana_minutos: 20,
  por_persona: [
    {
      usuario_id: '9d2a3b8c-4e5f-4061-8cbd-2e3f4a5b6c7d',
      nombre: 'Ana',
      asignadas: 2,
      contactadas: 2,
      tasa: 1,
      mediana_minutos: 20,
    },
    {
      usuario_id: 'ae3b4c9d-5f60-4172-9dce-3f4a5b6c7d8e',
      nombre: null,
      asignadas: 2,
      contactadas: 0,
      tasa: 0,
      mediana_minutos: null,
    },
  ],
  por_persona_hay_mas: false,
}

describe('esquemaDeColaWeb', () => {
  it('acepta la forma de la RPC, con turnos y vacía', () => {
    expect(esquemaDeColaWeb.safeParse(DE_COLA).success).toBe(true)
    const vacia = {
      ...DE_COLA,
      total: 0,
      por_estado: { asignada: 0, contactada: 0, vencida: 0, sin_asignar: 0, cancelada: 0 },
      directas: 0,
      asignadas: 0,
      contactadas: 0,
      tasa: null,
      mediana_minutos: null,
      por_persona: [],
    }
    expect(esquemaDeColaWeb.safeParse(vacia).success).toBe(true)
  })

  it('sin uno de los cinco estados no pasa', () => {
    const { cancelada: _cancelada, ...sinCancelada } = POR_ESTADO
    expect(esquemaDeColaWeb.safeParse({ ...DE_COLA, por_estado: sinCancelada }).success).toBe(false)
  })
})
