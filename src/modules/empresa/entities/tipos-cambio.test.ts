import { describe, expect, it } from 'vitest'
import {
  claveDeTipoCambio,
  decimalesDeValor,
  historialDesde,
  textoParaEditar,
  tiposCambioDesde,
  VALOR_INVALIDO,
  valorTipeado,
  vigentes,
  type TipoCambio,
} from './tipos-cambio'

function tipo(datos: Partial<TipoCambio>): TipoCambio {
  return {
    id: 'a',
    clave: 'oficial',
    nombre: 'Oficial',
    monedaDe: 'USD',
    monedaA: 'BOB',
    valor: 6.96,
    esDefault: false,
    activo: true,
    actualizadoEn: '2026-10-12T14:00:00+00:00',
    ...datos,
  }
}

describe('tiposCambioDesde', () => {
  it('convierte las filas con su versión', () => {
    const [convertido] = tiposCambioDesde([
      {
        id: 'a',
        clave: 'oficial',
        nombre: 'Oficial',
        moneda_de: 'USD',
        moneda_a: 'BOB',
        valor: 6.96,
        es_default: true,
        activo: true,
        orden: 0,
        actualizado_en: '2026-10-12T14:00:00+00:00',
        actualizado_por: null,
      },
    ])
    expect(convertido).toEqual(tipo({ esDefault: true }))
  })
})

describe('historialDesde', () => {
  it('pone el nombre de quien cambió el valor, o nada si no se sabe', () => {
    const nombres = new Map([['u1', 'Dalia Rojas']])
    const historial = historialDesde(
      [
        {
          id: 3,
          valor_anterior: 6.96,
          valor_nuevo: 6.97,
          cambiado_por: 'u1',
          cambiado_en: '2026-10-12T14:00:00+00:00',
        },
        {
          id: 2,
          valor_anterior: 6.9,
          valor_nuevo: 6.96,
          cambiado_por: 'u9',
          cambiado_en: '2026-10-11T14:00:00+00:00',
        },
        {
          id: 1,
          valor_anterior: null,
          valor_nuevo: 6.9,
          cambiado_por: null,
          cambiado_en: '2026-10-10T14:00:00+00:00',
        },
      ],
      nombres,
    )
    expect(historial.map((cambio) => cambio.cambiadoPor)).toEqual(['Dalia Rojas', null, null])
    expect(historial[2]).toMatchObject({ valorAnterior: null, valorNuevo: 6.9 })
  })
})

describe('vigentes', () => {
  it('deja sólo los activos, con el por defecto adelante y el resto en su orden', () => {
    const lista = [
      tipo({ id: '1', clave: 'banco' }),
      tipo({ id: '2', clave: 'viejo', activo: false }),
      tipo({ id: '3', clave: 'oficial', esDefault: true }),
      tipo({ id: '4', clave: 'paralelo' }),
    ]
    expect(vigentes(lista).map((uno) => uno.clave)).toEqual(['oficial', 'banco', 'paralelo'])
  })

  it('no modifica la lista que recibe', () => {
    const lista = [tipo({ id: '1' }), tipo({ id: '2', esDefault: true })]
    vigentes(lista)
    expect(lista.map((uno) => uno.id)).toEqual(['1', '2'])
  })
})

describe('claveDeTipoCambio', () => {
  it('arma la clave con la forma que exige la base', () => {
    expect(claveDeTipoCambio('Banco Unión')).toBe('banco_union')
    expect(claveDeTipoCambio('  Paralelo  ')).toBe('paralelo')
    expect(claveDeTipoCambio('Dólar blue / venta')).toBe('dolar_blue_venta')
  })

  it('devuelve null si del nombre no sale una clave', () => {
    expect(claveDeTipoCambio('123')).toBeNull()
    expect(claveDeTipoCambio('¡!')).toBeNull()
    expect(claveDeTipoCambio('x')).toBeNull()
  })
})

describe('decimalesDeValor', () => {
  it('usa los decimales que el valor tiene, entre 2 y 6', () => {
    expect(decimalesDeValor(6.96)).toBe(2)
    expect(decimalesDeValor(7)).toBe(2)
    expect(decimalesDeValor(12.405)).toBe(3)
    expect(decimalesDeValor(0.000145)).toBe(6)
  })
})

describe('valorTipeado', () => {
  const valor = (texto: string, locale = 'es-BO') => {
    const leido = valorTipeado(texto, locale)
    return leido.ok ? leido.valor : leido.motivo
  }

  it('lee con el locale de la empresa: la coma decimal y el punto de miles en grupos de 3 (4-25, P5)', () => {
    expect(valor('6,97')).toBe(6.97)
    expect(valor('7')).toBe(7)
    expect(valor(' 12.405 ')).toBe(12405)
    expect(valor('1.234,56')).toBe(1234.56)
    expect(valor('6.96', 'en-US')).toBe(6.96)
  })

  it('un punto fuera de un grupo de 3 dice su aviso', () => {
    expect(valor('6.96')).toBe('Usa coma para los decimales: 6,96.')
  })

  it('rechaza lo que no es un valor mayor que cero con hasta seis decimales', () => {
    for (const texto of ['', '0', '-1', 'siete', '1e3', '1,2345678', '6,9600001']) {
      expect(valor(texto), texto).toBe(VALOR_INVALIDO)
    }
  })
})

describe('textoParaEditar (4.13-3c)', () => {
  it('el valor guardado sale con el decimal del locale, toda su precisión y sin miles', () => {
    expect(textoParaEditar(2.125, 'es-BO')).toBe('2,125')
    expect(textoParaEditar(6.96, 'es-BO')).toBe('6,96')
    expect(textoParaEditar(12405.5, 'es-BO')).toBe('12405,5')
    expect(textoParaEditar(2.125, 'en-US')).toBe('2.125')
  })
})

describe('abrir lo guardado y guardar sin tocar conserva el valor (4.13-3c, C14)', () => {
  it('2,125, 6,96 y 12405,5 en es-BO y en en-US', () => {
    for (const locale of ['es-BO', 'en-US']) {
      for (const valor of [2.125, 6.96, 12405.5]) {
        expect(valorTipeado(textoParaEditar(valor, locale), locale)).toEqual({ ok: true, valor })
      }
    }
  })
})
