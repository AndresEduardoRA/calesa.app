import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { leadsDeDemo } from './datos-de-demo.mjs'
import {
  entradasDeCotizacion,
  parejasDeCotizacion,
  ubicarVehiculos,
  vehiculosDeDemo,
} from './vehiculos-de-demo.mjs'

// Las fórmulas que siembra `supabase/semillas/`: los vehículos tienen que caer en sus tablas para que la base calcule el total.
function formulaDeLaSemilla(archivo: string) {
  const sql = readFileSync(join(process.cwd(), 'supabase/semillas', archivo), 'utf8')
  const json = (nombre: string) => {
    const m = new RegExp(`${nombre} := \\$j\\$([\\s\\S]*?)\\$j\\$;`).exec(sql)
    return JSON.parse(m?.[1] ?? 'null') as Record<string, unknown>
  }
  const nodos = (json('v_def')['nodos'] ?? []) as { id: string; tipo: string }[]
  const tablas = (json('v_params')['tablas'] ?? {}) as Record<string, Record<string, unknown>[]>
  return { inputs: nodos.filter((n) => n.tipo === 'input').map((n) => n.id), tablas }
}

describe('sembrar: los vehículos', () => {
  const vehiculos = vehiculosDeDemo()

  it('son diez, con ids y VIN de ficción válidos y que no se repiten', () => {
    expect(vehiculos).toHaveLength(10)
    expect(new Set(vehiculos.map((v) => v.id)).size).toBe(10)
    const vins = vehiculos.flatMap((v) => ('vin' in v.datos ? [v.datos.vin] : []))
    expect(vins.length).toBeGreaterThan(0)
    expect(new Set(vins).size).toBe(vins.length)
    for (const vin of vins) expect(vin).toMatch(/^DEMXV[A-HJ-NPR-Z0-9]{12}$/)
    for (const v of vehiculos) expect(v.datos.titulo.length).toBeLessThanOrEqual(160)
  })

  for (const archivo of ['cotizador-subasta-usa.sql', 'cotizador-planilla-usa.sql']) {
    it(`los de subasta caen en las tablas de ${archivo} y tipean sólo sus inputs`, () => {
      const { inputs, tablas } = formulaDeLaSemilla(archivo)
      const anios = (tablas['depreciacion'] ?? []).map((f) => f['anio'])
      const conTransporte = (tablas['transporte_usa_bolivia'] ?? [])
        .filter((f) => typeof f['cliente'] === 'number')
        .map((f) => f['tipo'])
      for (const v of vehiculos.filter((x) => x.tipoDeOrigen === 'subasta')) {
        expect(anios).toContain(v.datos.anio)
        expect(conTransporte).toContain(v.atributos['tipo_vehiculo'])
        for (const nodo of Object.keys(v.cotizar)) expect(inputs).toContain(nodo)
      }
    })
  }

  it('los de plaza tipean sólo los inputs de la fórmula de oficina', () => {
    const { inputs } = formulaDeLaSemilla('cotizador-oficina.sql')
    for (const v of vehiculos.filter((x) => x.tipoDeOrigen === 'manual')) {
      expect(Object.keys(v.cotizar).every((nodo) => inputs.includes(nodo))).toBe(true)
    }
  })

  const origenes = [
    { id: 's1', nombre: 'S1', tipo: 'subasta', activo: true },
    { id: 'm1', nombre: 'M1', tipo: 'manual', activo: true },
    { id: 's2', nombre: 'S2', tipo: 'subasta', activo: true },
    { id: 's3', nombre: 'S3', tipo: 'subasta', activo: false },
  ]

  it('van en ronda a los orígenes activos de su tipo; sin uno de su tipo, no se siembran', () => {
    const { ubicados, sinOrigen } = ubicarVehiculos(vehiculos, origenes)
    expect(sinOrigen).toEqual([])
    expect(ubicados.map((v) => v.origen.id)).toEqual([
      's1',
      's2',
      's1',
      's2',
      's1',
      's2',
      's1',
      'm1',
      'm1',
      'm1',
    ])
    const soloPlaza = ubicarVehiculos(
      vehiculos,
      origenes.filter((o) => o.tipo === 'manual'),
    )
    expect(soloPlaza.ubicados).toHaveLength(3)
    expect(soloPlaza.sinOrigen).toHaveLength(7)
  })

  it('las cotizaciones alternan orígenes y no pasan de los leads ni de los vehículos', () => {
    const { ubicados } = ubicarVehiculos(vehiculos, origenes)
    const leads = leadsDeDemo()
    const parejas = parejasDeCotizacion(leads, ubicados)
    expect(parejas).toHaveLength(5)
    expect(parejas.map((p) => p.vehiculo.origen.id)).toEqual(['s1', 's2', 'm1', 's1', 's2'])
    expect(parejas.map((p) => p.lead.n)).toEqual([1, 2, 3, 4, 5])
    expect(new Set(parejas.map((p) => p.id)).size).toBe(5)
    expect(parejasDeCotizacion(leads.slice(0, 2), ubicados)).toHaveLength(2)
  })

  it('lo tipeado se queda con los inputs que quien cotiza puede editar', () => {
    const [primero] = vehiculos
    const r = entradasDeCotizacion(primero!, new Set(['remate', 'grua']))
    expect(r.entradas).toEqual({ inputs: { remate: 9800, grua: 350 }, banderas: {}, overrides: {} })
    expect(r.omitidos).toEqual(['valor_tabla'])
  })
})
