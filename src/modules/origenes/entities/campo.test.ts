import { describe, expect, it } from 'vitest'
import {
  agruparCampos,
  cambiosComoColumnas,
  cambiosRespectoDe,
  camposDesde,
  claveDeCampo,
  destinoDeMovimiento,
  necesitaVistaPrevia,
  nombresDeGrupo,
  opcionesQuitadas,
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

describe('cambios', () => {
  const [campo] = layout({
    tipo: 'opcion',
    opciones: [
      { clave: 'a', etiqueta: 'A' },
      { clave: 'b', etiqueta: 'B' },
    ],
  })
  if (!campo) {
    throw new Error('sin campo')
  }
  const igual = {
    etiqueta: campo.etiqueta,
    tipo: campo.tipo,
    opciones: campo.opciones,
    requerido: campo.requerido,
    grupo: campo.grupo,
    enTarjeta: campo.enTarjeta,
    filtrable: campo.filtrable,
    publicoWeb: campo.publicoWeb,
    claveApibara: campo.claveApibara,
    activo: campo.activo,
  }

  it('sin tocar nada no hay cambios', () => {
    expect(cambiosRespectoDe(campo, igual)).toEqual({})
  })

  it('sólo viaja lo que cambió', () => {
    expect(cambiosRespectoDe(campo, { ...igual, filtrable: true, grupo: null })).toEqual({
      filtrable: true,
      grupo: null,
    })
  })

  it('traduce a columnas y deja un nulo explícito', () => {
    expect(cambiosComoColumnas({ enTarjeta: true, grupo: null, publicoWeb: false })).toEqual({
      en_tarjeta: true,
      grupo: null,
      publico_web: false,
    })
  })

  it('sabe qué opciones se sacan', () => {
    expect(opcionesQuitadas(campo, { opciones: [{ clave: 'a', etiqueta: 'A' }] })).toEqual([
      { clave: 'b', etiqueta: 'B' },
    ])
    expect(opcionesQuitadas(campo, {})).toEqual([])
  })

  it('pide contar sólo cuando un cambio puede tocar datos', () => {
    expect(necesitaVistaPrevia(campo, { filtrable: true })).toBe(false)
    expect(necesitaVistaPrevia(campo, { activo: false })).toBe(false)
    expect(necesitaVistaPrevia(campo, { tipo: 'texto' })).toBe(true)
    expect(necesitaVistaPrevia(campo, { requerido: true })).toBe(true)
    expect(necesitaVistaPrevia(campo, { opciones: [{ clave: 'a', etiqueta: 'A' }] })).toBe(true)
    expect(
      necesitaVistaPrevia(campo, {
        opciones: [
          { clave: 'a', etiqueta: 'A' },
          { clave: 'b', etiqueta: 'Be' },
        ],
      }),
    ).toBe(false)
  })
})

describe('tieneOpciones', () => {
  it('sólo los campos de opciones', () => {
    expect(tieneOpciones('opcion')).toBe(true)
    expect(tieneOpciones('multi_opcion')).toBe(true)
    expect(tieneOpciones('texto')).toBe(false)
  })
})
