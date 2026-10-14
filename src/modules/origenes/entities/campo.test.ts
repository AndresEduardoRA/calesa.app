import { describe, expect, it } from 'vitest'
import { camposDesde, claveDeCampo, type CampoDeLayout } from './campo'

const ORIGEN = '00000000-0000-0000-0000-0000000000aa'

function fila(n: number, extra: Record<string, unknown> = {}) {
  return {
    id: `00000000-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`,
    origen_id: ORIGEN,
    clave: `campo_${n}`,
    etiqueta: `Campo ${n}`,
    tipo: 'texto',
    opciones: [],
    requerido: false,
    valor_defecto: null,
    grupo: 'Vehículo',
    orden: n * 10,
    en_tarjeta: false,
    filtrable: false,
    publico_web: false,
    clave_apibara: null,
    es_sistema: false,
    activo: true,
    actualizado_en: '2026-10-12T20:00:00+00:00',
    ...extra,
  }
}

function layout(...extras: Record<string, unknown>[]): CampoDeLayout[] {
  return camposDesde(extras.map((extra, i) => fila(i + 1, extra)))
}

describe('camposDesde', () => {
  it('los deja en el orden del layout', () => {
    const campos = camposDesde([fila(3), fila(1), fila(2)])
    expect(campos.map((campo) => campo.clave)).toEqual(['campo_1', 'campo_2', 'campo_3'])
  })

  it('unas opciones mal formadas no tumban la pantalla', () => {
    const [campo] = camposDesde([fila(1, { opciones: 'no es una lista' })])
    expect(campo?.opciones).toEqual([])
  })

  it('trae el valor por defecto, y uno mal formado es «sin valor»', () => {
    expect(layout({ valor_defecto: 'Gris' })[0]?.valorDefecto).toBe('Gris')
    expect(layout({ valor_defecto: ['a', 'b'] })[0]?.valorDefecto).toEqual(['a', 'b'])
    expect(layout({ valor_defecto: { raro: true } })[0]?.valorDefecto).toBeNull()
  })

  it('rechaza un tipo que la base no conoce', () => {
    expect(() => camposDesde([fila(1, { tipo: 'mapa' })])).toThrow()
  })
})

describe('claveDeCampo', () => {
  it('sale de la etiqueta', () => {
    expect(claveDeCampo('Kit de extras', [])).toBe('kit_de_extras')
  })

  it('no choca con una columna de vehículos ni con otro campo', () => {
    expect(claveDeCampo('VIN', [])).toBe('vin_2')
    expect(claveDeCampo('Color', ['color'])).toBe('color_2')
    expect(claveDeCampo('Color', ['color', 'color_2'])).toBe('color_3')
  })
})
