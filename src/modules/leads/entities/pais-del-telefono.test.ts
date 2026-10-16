import { describe, expect, it } from 'vitest'
import {
  lineaDelTelefono,
  nombresDeOpciones,
  paisDelEscrito,
  numeroConCodigo,
  paisAlCambiarElTelefono,
  paisParaGuardar,
  resolverTelefono,
  textoDelPais,
  vistaDelPais,
  type EmpresaDelTelefono,
  type TelefonoResuelto,
} from './pais-del-telefono'
import { TABLA_DE_PAISES } from './paises/tabla'

const BOLIVIA: EmpresaDelTelefono = { telefonoCc: '+591', pais: 'Bolivia' }

function resolver(numero: string, internacional: boolean, empresa: EmpresaDelTelefono = BOLIVIA) {
  return resolverTelefono(TABLA_DE_PAISES, { numero, internacional, empresa })
}

describe('resolverTelefono', () => {
  it('un número con «+» de otro país dice el suyo', () => {
    const r = resolver('5491155550000', true)
    expect(r).toEqual({ codigo: '54', pais: { tipo: 'pais', nombre: 'Argentina' } })
    expect(lineaDelTelefono('5491155550000', r)).toBe('+54 91155550000 · Argentina')
  })

  it('un número sin «+» es de la empresa y dice su país', () => {
    const r = resolver('59170011002', false)
    expect(lineaDelTelefono('59170011002', r)).toBe('+591 70011002 · Bolivia')
  })

  it('un número internacional del país de la empresa usa el texto de la empresa', () => {
    const empresa = { telefonoCc: '+591', pais: 'Bolivia (Estado Plurinacional)' }
    const r = resolver('59170011002', true, empresa)
    expect(r.pais).toEqual({ tipo: 'pais', nombre: 'Bolivia (Estado Plurinacional)' })
  })

  it('otro país no usa el texto de la empresa', () => {
    const r = resolver('5491155550000', true, { telefonoCc: '+591', pais: 'Mi país' })
    expect(r.pais).toEqual({ tipo: 'pais', nombre: 'Argentina' })
  })

  it('+1 con un área propia no es el país de una empresa en +1', () => {
    const eeuu = { telefonoCc: '+1', pais: 'Estados Unidos' }
    expect(resolver('18095551234', true, eeuu).pais).toEqual({
      tipo: 'pais',
      nombre: 'República Dominicana',
    })
    // La misma regla que la de la empresa: se guarda su texto.
    expect(resolver('13055550100', true, eeuu).pais).toEqual({
      tipo: 'pais',
      nombre: 'Estados Unidos',
    })
  })

  it('+1 en una empresa de otro país no se adivina', () => {
    const r = resolver('13055550100', true)
    expect(r.pais.tipo).toBe('varios')
    expect(lineaDelTelefono('13055550100', r)).toBe('+1 3055550100 · Estados Unidos o Canadá')
    expect(paisParaGuardar(r)).toBeNull()
  })

  it('un prefijo desconocido lo dice y no parte el número', () => {
    const r = resolver('99912345678', true)
    expect(r).toEqual({ codigo: null, pais: { tipo: 'desconocido' } })
    expect(lineaDelTelefono('99912345678', r)).toBe('+99912345678 · Código de país desconocido')
  })

  it('sin código de empresa, un número internacional usa la tabla', () => {
    const r = resolver('59170011002', true, { telefonoCc: null, pais: 'Bolivia' })
    expect(r.pais).toEqual({ tipo: 'pais', nombre: 'Bolivia' })
  })

  it('una empresa sin texto de país usa el de la tabla', () => {
    const r = resolver('59170011002', false, { telefonoCc: '+591', pais: '  ' })
    expect(r.pais).toEqual({ tipo: 'pais', nombre: 'Bolivia' })
  })

  it('el código de una empresa desconocida parte sus números nacionales', () => {
    const r = resolver('99912345678', false, { telefonoCc: '+999', pais: 'Atlántida' })
    expect(r).toEqual({ codigo: '999', pais: { tipo: 'pais', nombre: 'Atlántida' } })
  })
})

describe('textos', () => {
  it('nombresDeOpciones junta con coma y «o»', () => {
    const op = (iso: string, nombre: string) => ({ iso, nombre })
    expect(nombresDeOpciones([op('US', 'Estados Unidos'), op('CA', 'Canadá')])).toBe(
      'Estados Unidos o Canadá',
    )
    expect(
      nombresDeOpciones([op('GP', 'Guadalupe'), op('BL', 'San Bartolomé'), op('MF', 'San Martín')]),
    ).toBe('Guadalupe, San Bartolomé o San Martín')
    expect(nombresDeOpciones([op('BO', 'Bolivia')])).toBe('Bolivia')
    expect(nombresDeOpciones([])).toBe('')
  })

  it('numeroConCodigo parte sólo si sabe', () => {
    expect(numeroConCodigo('5491155550000', '54')).toBe('+54 91155550000')
    expect(numeroConCodigo('5491155550000', null)).toBe('+5491155550000')
    expect(numeroConCodigo('54', '54')).toBe('+54')
  })

  it('textoDelPais', () => {
    expect(textoDelPais({ tipo: 'pais', nombre: 'Chile' })).toBe('Chile')
    expect(textoDelPais({ tipo: 'desconocido' })).toBe('Código de país desconocido')
  })
})

describe('paisAlCambiarElTelefono', () => {
  const argentina: TelefonoResuelto = {
    codigo: '54',
    pais: { tipo: 'pais', nombre: 'Argentina' },
  }
  const varios: TelefonoResuelto = {
    codigo: '1',
    pais: { tipo: 'varios', opciones: [{ iso: 'US', nombre: 'Estados Unidos' }] },
  }

  it('no toca nada si todavía no es un teléfono', () => {
    expect(
      paisAlCambiarElTelefono({ actual: 'Bolivia', sugeridos: ['Bolivia'], resuelto: null }),
    ).toEqual({
      cambia: false,
    })
  })

  it('reemplaza lo que el sistema puso', () => {
    expect(
      paisAlCambiarElTelefono({ actual: 'Bolivia', sugeridos: ['Bolivia'], resuelto: argentina }),
    ).toEqual({ cambia: true, valor: 'Argentina' })
  })

  it('llena un «País» vacío', () => {
    expect(paisAlCambiarElTelefono({ actual: '  ', sugeridos: [], resuelto: argentina })).toEqual({
      cambia: true,
      valor: 'Argentina',
    })
  })

  it('no pisa lo que la persona escribió', () => {
    expect(
      paisAlCambiarElTelefono({ actual: 'Perú', sugeridos: ['Bolivia'], resuelto: argentina }),
    ).toEqual({ cambia: false })
  })

  it('sigue lo que se sugirió antes o se eligió con un botón', () => {
    expect(
      paisAlCambiarElTelefono({
        actual: 'Canadá',
        sugeridos: ['Bolivia', 'Canadá'],
        resuelto: argentina,
      }),
    ).toEqual({ cambia: true, valor: 'Argentina' })
  })

  it('no cambia si ya está', () => {
    expect(
      paisAlCambiarElTelefono({
        actual: 'Argentina',
        sugeridos: ['Argentina'],
        resuelto: argentina,
      }),
    ).toEqual({ cambia: false })
  })

  it('un compartido deja «País» vacío si lo seguía, y no toca lo escrito', () => {
    expect(
      paisAlCambiarElTelefono({ actual: 'Bolivia', sugeridos: ['Bolivia'], resuelto: varios }),
    ).toEqual({ cambia: true, valor: '' })
    expect(paisAlCambiarElTelefono({ actual: '', sugeridos: [], resuelto: varios })).toEqual({
      cambia: false,
    })
    expect(paisAlCambiarElTelefono({ actual: 'Perú', sugeridos: [], resuelto: varios })).toEqual({
      cambia: false,
    })
  })
})

describe('paisDelEscrito', () => {
  it('resuelve lo que se tipea con el código de la empresa', () => {
    expect(paisDelEscrito(TABLA_DE_PAISES, '+54 9 11 5555-0000', BOLIVIA)).toEqual({
      numero: '5491155550000',
      resuelto: { codigo: '54', pais: { tipo: 'pais', nombre: 'Argentina' } },
    })
    expect(paisDelEscrito(TABLA_DE_PAISES, '700 11 002', BOLIVIA)?.resuelto.pais).toEqual({
      tipo: 'pais',
      nombre: 'Bolivia',
    })
  })

  it('no dice nada de lo que todavía no es un teléfono ni sin la tabla', () => {
    expect(paisDelEscrito(TABLA_DE_PAISES, '+59', BOLIVIA)).toBeNull()
    expect(paisDelEscrito(TABLA_DE_PAISES, '7001abcd', BOLIVIA)).toBeNull()
    expect(paisDelEscrito(TABLA_DE_PAISES, '', BOLIVIA)).toBeNull()
    expect(paisDelEscrito(null, '+54 9 11 5555-0000', BOLIVIA)).toBeNull()
  })

  it('sin código de la empresa, un número nacional no es un teléfono', () => {
    const sinCodigo = { telefonoCc: null, pais: 'Bolivia' }
    expect(paisDelEscrito(TABLA_DE_PAISES, '70011002', sinCodigo)).toBeNull()
    expect(paisDelEscrito(TABLA_DE_PAISES, '+591 70011002', sinCodigo)).not.toBeNull()
  })

  it('+999 existe como número y no tiene país', () => {
    const r = paisDelEscrito(TABLA_DE_PAISES, '+999 1234 5678', BOLIVIA)
    expect(r?.resuelto.pais).toEqual({ tipo: 'desconocido' })
  })
})

describe('vistaDelPais', () => {
  const de = (escrito: string) => paisDelEscrito(TABLA_DE_PAISES, escrito, BOLIVIA)
  const campo = (valor: string) => ({ etiqueta: 'País', valor })

  it('sin un teléfono no hay nada que decir', () => {
    expect(vistaDelPais(null, campo(''))).toEqual({ linea: null, opciones: [], anuncio: null })
  })

  it('dice el país y, si «País» ya lo tiene, que se completó', () => {
    expect(vistaDelPais(de('+54 9 11 5555-0000'), campo('Argentina'))).toEqual({
      linea: '+54 91155550000 · Argentina',
      opciones: [],
      anuncio: 'País del teléfono: Argentina. Se completó «País».',
    })
    expect(vistaDelPais(de('+54 9 11 5555-0000'), campo('Perú')).anuncio).toBe(
      'País del teléfono: Argentina.',
    )
    expect(vistaDelPais(de('+54 9 11 5555-0000'), null).anuncio).toBe(
      'País del teléfono: Argentina.',
    )
  })

  it('un prefijo compartido ofrece sus países y no anuncia que completó nada', () => {
    const vista = vistaDelPais(de('+1 305 555 0100'), campo(''))
    expect(vista.opciones.map((o) => o.nombre)).toEqual(['Estados Unidos', 'Canadá'])
    expect(vista.linea).toBe('+1 3055550100 · Estados Unidos o Canadá')
    expect(vista.anuncio).toBe('País del teléfono: Estados Unidos o Canadá.')
  })

  it('un código desconocido dice la línea y no anuncia', () => {
    expect(vistaDelPais(de('+999 1234 5678'), campo(''))).toEqual({
      linea: '+99912345678 · Código de país desconocido',
      opciones: [],
      anuncio: null,
    })
  })
})
