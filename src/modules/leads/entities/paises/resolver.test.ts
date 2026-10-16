import { describe, expect, it } from 'vitest'
import { paisDelNumero } from './resolver'
import { TABLA_DE_PAISES } from './tabla'

const pais = (numero: string) => {
  const r = paisDelNumero(TABLA_DE_PAISES, numero)
  return r.tipo === 'pais' ? `${r.iso} +${r.codigo}` : r.tipo
}

describe('paisDelNumero', () => {
  it.each([
    ['59170011002', 'BO +591'],
    ['5491155550000', 'AR +54'],
    ['5215555550100', 'MX +52'],
    ['573001234567', 'CO +57'],
    ['34600123456', 'ES +34'],
    ['447911123456', 'GB +44'],
    ['4915112345678', 'DE +49'],
    ['8613812345678', 'CN +86'],
    ['819012345678', 'JP +81'],
    ['919876543210', 'IN +91'],
    ['971501234567', 'AE +971'],
    ['3538712345678', 'IE +353'],
    ['21612345678', 'TN +216'],
    ['2348012345678', 'NG +234'],
    ['886912345678', 'TW +886'],
    ['85291234567', 'HK +852'],
    ['998901234567', 'UZ +998'],
  ])('un país de prefijo único: %s', (numero, esperado) => {
    expect(pais(numero)).toBe(esperado)
  })

  it('el prefijo más largo gana: el Caribe del +1 tiene país propio', () => {
    expect(pais('18095551234')).toBe('DO +1')
    expect(pais('18295551234')).toBe('DO +1')
    expect(pais('17875551234')).toBe('PR +1')
    expect(pais('18765551234')).toBe('JM +1')
    expect(pais('12425551234')).toBe('BS +1')
    expect(pais('16715551234')).toBe('GU +1')
  })

  it('+1 sin área propia no se adivina: Estados Unidos o Canadá', () => {
    for (const numero of ['13055550100', '14165550100', '12125550100']) {
      const r = paisDelNumero(TABLA_DE_PAISES, numero)
      expect(r).toMatchObject({ tipo: 'varios', codigo: '1' })
      if (r.tipo === 'varios') {
        expect(r.opciones.map((o) => o.iso)).toEqual(['US', 'CA'])
      }
    }
  })

  it('+590 no se adivina: Guadalupe, San Bartolomé o San Martín', () => {
    const r = paisDelNumero(TABLA_DE_PAISES, '590690123456')
    expect(r).toMatchObject({ tipo: 'varios', codigo: '590' })
    if (r.tipo === 'varios') {
      expect(r.opciones.map((o) => o.iso)).toEqual(['GP', 'BL', 'MF'])
    }
  })
})

describe('paisDelNumero: subprefijos y casos límite', () => {
  it('+7 es Rusia, salvo 76 y 77 que son de Kazajistán', () => {
    expect(pais('79123456789')).toBe('RU +7')
    expect(pais('77012345678')).toBe('KZ +7')
    expect(pais('76012345678')).toBe('KZ +7')
  })

  it('los subprefijos deterministas', () => {
    expect(pais('262269123456')).toBe('YT +262')
    expect(pais('262639123456')).toBe('YT +262')
    expect(pais('262262123456')).toBe('RE +262')
    expect(pais('59995123456')).toBe('CW +599')
    expect(pais('59971234567')).toBe('BQ +599')
    expect(pais('35818123456')).toBe('AX +358')
    expect(pais('358401234567')).toBe('FI +358')
    expect(pais('390669812345')).toBe('VA +39')
    expect(pais('3906123456789')).toBe('IT +39')
    expect(pais('2125288123456')).toBe('EH +212')
    expect(pais('212612345678')).toBe('MA +212')
    expect(pais('61891621234')).toBe('CX +61')
    expect(pais('61412345678')).toBe('AU +61')
    expect(pais('4779123456')).toBe('SJ +47')
    expect(pais('4791234567')).toBe('NO +47')
  })

  it('un prefijo desconocido', () => {
    expect(paisDelNumero(TABLA_DE_PAISES, '99912345678')).toEqual({ tipo: 'desconocido' })
    expect(paisDelNumero(TABLA_DE_PAISES, '80012345678')).toEqual({ tipo: 'desconocido' })
    expect(paisDelNumero(TABLA_DE_PAISES, '87012345678')).toEqual({ tipo: 'desconocido' })
  })

  it('un número corto no inventa un país', () => {
    expect(paisDelNumero(TABLA_DE_PAISES, '59')).toEqual({ tipo: 'desconocido' })
    expect(paisDelNumero(TABLA_DE_PAISES, '')).toEqual({ tipo: 'desconocido' })
  })

  it('el nombre sale de la tabla, en español', () => {
    expect(paisDelNumero(TABLA_DE_PAISES, '5491155550000')).toMatchObject({ nombre: 'Argentina' })
    expect(paisDelNumero(TABLA_DE_PAISES, '18095551234')).toMatchObject({
      nombre: 'República Dominicana',
    })
  })
})
