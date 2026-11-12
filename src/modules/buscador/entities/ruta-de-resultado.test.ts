import { describe, expect, it } from 'vitest'
import { rutaDeLaFicha, rutaDeVerTodos } from './ruta-de-resultado'

const ID = '0b0c7b3e-1111-4222-8333-444455556666'

describe('rutaDeLaFicha', () => {
  it('cada tipo lleva a su ficha', () => {
    expect(rutaDeLaFicha('lead', ID)).toBe(`/leads/${ID}`)
    expect(rutaDeLaFicha('vehiculo', ID)).toBe(`/vehiculos/${ID}`)
    expect(rutaDeLaFicha('cotizacion', ID)).toBe(`/cotizaciones/${ID}`)
  })

  it('un id con caracteres raros se codifica', () => {
    expect(rutaDeLaFicha('lead', 'a/b?c')).toBe('/leads/a%2Fb%3Fc')
  })
})

describe('rutaDeVerTodos', () => {
  it('lleva el texto al filtro q del listado de leads', () => {
    expect(rutaDeVerTodos('ana y luis')).toBe('/leads?q=ana+y+luis')
  })

  it('codifica lo que cambiaría la query', () => {
    expect(rutaDeVerTodos('a&b=c')).toBe('/leads?q=a%26b%3Dc')
  })
})
