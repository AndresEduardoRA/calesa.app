import { describe, expect, it } from 'vitest'
import { conPaisDelTelefono, conPaisElegido, limpio } from './estado-del-alta'

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'

const PAIS = 'atributos.pais'
const argentina = { codigo: '54', pais: { tipo: 'pais' as const, nombre: 'Argentina' } }
const chile = { codigo: '56', pais: { tipo: 'pais' as const, nombre: 'Chile' } }
const compartido = {
  codigo: '1',
  pais: { tipo: 'varios' as const, opciones: [{ iso: 'US', nombre: 'Estados Unidos' }] },
}
const con = (pais: string) => limpio(ID, { telefono_principal: '', [PAIS]: pais })

describe('«País» sigue al número', () => {
  it('reemplaza el de la empresa y lo recuerda como puesto por el sistema', () => {
    const uno = conPaisDelTelefono(con('Bolivia'), {
      clave: PAIS,
      inicial: 'Bolivia',
      anterior: null,
      ahora: argentina,
    })
    expect(uno.valores[PAIS]).toBe('Argentina')
    expect(uno.paisesPuestos).toEqual(['Argentina'])
    const dos = conPaisDelTelefono(uno, {
      clave: PAIS,
      inicial: 'Bolivia',
      anterior: argentina,
      ahora: chile,
    })
    expect(dos.valores[PAIS]).toBe('Chile')
  })

  it('no pisa lo que la persona escribió, y si lo borra vuelve a seguir', () => {
    const escrito = con('Perú')
    const igual = conPaisDelTelefono(escrito, {
      clave: PAIS,
      inicial: 'Bolivia',
      anterior: argentina,
      ahora: chile,
    })
    expect(igual).toBe(escrito)
    const borrado = conPaisDelTelefono(con(''), {
      clave: PAIS,
      inicial: 'Bolivia',
      anterior: argentina,
      ahora: chile,
    })
    expect(borrado.valores[PAIS]).toBe('Chile')
  })

  it('un borrador repuesto sigue al número: el país de su teléfono anterior cuenta', () => {
    const repuesto = conPaisDelTelefono(con('Argentina'), {
      clave: PAIS,
      inicial: 'Bolivia',
      anterior: argentina,
      ahora: chile,
    })
    expect(repuesto.valores[PAIS]).toBe('Chile')
  })

  it('un número que todavía no es teléfono no toca nada', () => {
    const estado = con('Bolivia')
    expect(
      conPaisDelTelefono(estado, {
        clave: PAIS,
        inicial: 'Bolivia',
        anterior: null,
        ahora: null,
      }),
    ).toBe(estado)
  })
})

describe('«País» y los prefijos compartidos', () => {
  it('un compartido deja «País» vacío y el botón lo elige y lo sigue', () => {
    const vacio = conPaisDelTelefono(con('Bolivia'), {
      clave: PAIS,
      inicial: 'Bolivia',
      anterior: null,
      ahora: compartido,
    })
    expect(vacio.valores[PAIS]).toBe('')
    const elegido = conPaisElegido(vacio, PAIS, 'Canadá')
    expect(elegido.valores[PAIS]).toBe('Canadá')
    const sigue = conPaisDelTelefono(elegido, {
      clave: PAIS,
      inicial: 'Bolivia',
      anterior: compartido,
      ahora: chile,
    })
    expect(sigue.valores[PAIS]).toBe('Chile')
  })
})
