import { describe, expect, it } from 'vitest'
import {
  agruparCampos,
  camposDesde,
  claveDeCampo,
  destinoDeMovimiento,
  nombresDeGrupo,
  tieneOpciones,
  type CampoDeLayout,
} from './campo'

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

describe('agruparCampos', () => {
  it('agrupa por el primer campo de cada grupo y deja «sin grupo» al final', () => {
    const grupos = agruparCampos(
      layout({ grupo: null }, { grupo: 'Subasta' }, { grupo: 'Vehículo' }, { grupo: 'Subasta' }),
    )
    expect(grupos.map((g) => g.nombre)).toEqual(['Subasta', 'Vehículo', null])
    expect(grupos[0]?.campos.map((c) => c.clave)).toEqual(['campo_2', 'campo_4'])
  })

  it('no muestra los desactivados', () => {
    const grupos = agruparCampos(layout({}, { activo: false }))
    expect(grupos.flatMap((g) => g.campos)).toHaveLength(1)
    expect(nombresDeGrupo(layout({}, { grupo: 'Venta', activo: false }))).toEqual(['Vehículo'])
  })
})

describe('destinoDeMovimiento', () => {
  const campos = layout({}, {}, {}, { grupo: 'Venta' })

  it('bajar lo pone después de su vecino de grupo', () => {
    expect(destinoDeMovimiento(campos, campos[0]?.id ?? '', 'bajar')).toEqual({
      despuesDe: campos[1]?.id,
    })
  })

  it('subir lo pone antes de su vecino: después del que estaba antes de él', () => {
    expect(destinoDeMovimiento(campos, campos[2]?.id ?? '', 'subir')).toEqual({
      despuesDe: campos[0]?.id,
    })
  })

  it('subir al segundo lo deja primero de todo', () => {
    expect(destinoDeMovimiento(campos, campos[1]?.id ?? '', 'subir')).toEqual({ despuesDe: null })
  })

  it('no se sale de su grupo', () => {
    expect(destinoDeMovimiento(campos, campos[0]?.id ?? '', 'subir')).toBeNull()
    expect(destinoDeMovimiento(campos, campos[2]?.id ?? '', 'bajar')).toBeNull()
    expect(destinoDeMovimiento(campos, campos[3]?.id ?? '', 'subir')).toBeNull()
  })

  it('cuenta los desactivados al medir «antes de»', () => {
    const conInactivo = layout({ activo: false }, {}, {})
    expect(destinoDeMovimiento(conInactivo, conInactivo[2]?.id ?? '', 'subir')).toEqual({
      despuesDe: conInactivo[0]?.id,
    })
  })

  it('un campo que no existe no se mueve', () => {
    expect(destinoDeMovimiento(campos, 'no-existe', 'subir')).toBeNull()
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

describe('tieneOpciones', () => {
  it('sólo los campos de opciones', () => {
    expect(tieneOpciones('opcion')).toBe(true)
    expect(tieneOpciones('multi_opcion')).toBe(true)
    expect(tieneOpciones('texto')).toBe(false)
  })
})
