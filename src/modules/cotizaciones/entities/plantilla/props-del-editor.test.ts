import { describe, expect, it } from 'vitest'
import type { Plantilla } from './forma-de-plantilla'
import type { PlantillaDelOrigen, VersionDePlantilla } from './lectura-de-la-plantilla'
import { propsDelEditor } from './props-del-editor'

const plantilla: Plantilla = {
  grupos: [{ grupo: 'compra' }],
  total: { etiqueta: 'T' },
  logo: true,
  columnas: { leyenda: false, plazo: false, tipo_cambio: false },
}
const HORA = '2026-11-07T15:00:00.123456+00:00'
const v = (extra: Partial<VersionDePlantilla> = {}): VersionDePlantilla => ({
  id: 'x',
  version: null,
  nota: null,
  actualizadoEn: HORA,
  publicadoEn: null,
  plantilla,
  motivo: null,
  ...extra,
})
const lectura = (extra: Partial<PlantillaDelOrigen> = {}): PlantillaDelOrigen => ({
  publicada: null,
  borrador: null,
  formula: { id: 'f', version: 1 },
  contexto: {
    definicion: {
      nodos: [
        {
          id: 'fees',
          grupo: 'compra',
          etiqueta: 'Fees',
          descripcion: 'secreto',
          op: 'suma',
        } as never,
      ],
      grupos: [{ id: 'compra', etiqueta: 'Compra', tono: 'verde', bucket: 'b' }],
    },
    diseno: null,
    visibilidad: { fees: { ver: 'todos', editar: 'x' } },
    tonos: ['verde'],
  },
  tonos: [{ clave: 'verde', nombre: 'Verde' }],
  ...extra,
})
const origen = { id: 'o', nombre: 'Origen', activo: true } as { id: string; nombre: string }

describe('propsDelEditor', () => {
  it('sin fórmula, nada', () => {
    expect(propsDelEditor(lectura({ formula: null, contexto: null }), origen)).toBeNull()
  })
  it('con fórmula, sólo lo que dibuja el editor: ni la definición ni el cuerpo de un nodo', () => {
    const r = propsDelEditor(lectura({ borrador: v() }), origen)!
    expect(Object.keys(r).sort()).toEqual([
      'avisos',
      'contexto',
      'de',
      'esperada',
      'guardada',
      'inicial',
      'origen',
      'publicada',
      'tonos',
    ])
    const texto = JSON.stringify(r)
    expect(texto).not.toContain('secreto')
    expect(texto).not.toContain('"op"')
    expect(texto).not.toContain('"editar"')
    expect(r.origen).toEqual({ id: 'o', nombre: 'Origen' })
  })
  it('la esperada es el actualizadoEn tal cual, o nula sin borrador', () => {
    expect(propsDelEditor(lectura({ borrador: v() }), origen)!.esperada).toBe(HORA)
    const sin = propsDelEditor(lectura(), origen)!
    expect(sin.esperada).toBeNull()
    expect(sin.guardada).toBeNull()
    expect(sin.de).toBe('omision')
  })
  it('la publicada va sin su plantilla', () => {
    const r = propsDelEditor(
      lectura({ publicada: v({ version: 3, nota: 'N', publicadoEn: HORA }) }),
      origen,
    )!
    expect(r.publicada).toEqual({ version: 3, nota: 'N', publicadoEn: HORA })
    expect(r.de).toBe('publicada')
  })
})
