import { describe, expect, it } from 'vitest'
import {
  esquemaGuardarApibara,
  esquemaGuardarSecreto,
  esquemaGuardarWebPublica,
} from './integraciones'

const version = '2026-10-12T14:00:00+00:00'

describe('esquemaGuardarApibara', () => {
  it('prender o apagar no manda la configuración', () => {
    expect(esquemaGuardarApibara.parse({ actualizadoEnEsperado: version, activa: true })).toEqual({
      actualizadoEnEsperado: version,
      activa: true,
    })
  })

  it('la configuración se valida: dirección https y al menos una plataforma', () => {
    const con = (config: object) =>
      esquemaGuardarApibara.safeParse({ actualizadoEnEsperado: version, ...config }).success
    expect(con({ endpoint: 'https://api.apibara.tech', plataformas: ['copart'] })).toBe(true)
    expect(con({ endpoint: 'http://api.apibara.tech', plataformas: ['copart'] })).toBe(false)
    expect(con({ endpoint: 'https://atacante.example', plataformas: ['copart'] })).toBe(false)
    expect(con({ endpoint: 'https://api.apibara.tech', plataformas: [] })).toBe(false)
    expect(con({ endpoint: 'https://api.apibara.tech' })).toBe(false)
  })

  it('el error de la dirección queda en su campo, en el primer nivel', () => {
    const leida = esquemaGuardarApibara.safeParse({
      actualizadoEnEsperado: version,
      endpoint: 'https://atacante.example',
      plataformas: ['copart'],
    })
    expect(leida.success ? [] : leida.error.issues.map((problema) => problema.path)).toEqual([
      ['endpoint'],
    ])
  })

  it('una clave de API metida en la configuración no pasa: no es parte de su forma', () => {
    const leida = esquemaGuardarApibara.parse({
      actualizadoEnEsperado: version,
      endpoint: 'https://api.apibara.tech',
      plataformas: ['iaai'],
      api_key: 'x',
    })
    expect(leida).toEqual({
      actualizadoEnEsperado: version,
      endpoint: 'https://api.apibara.tech',
      plataformas: ['iaai'],
    })
  })
})

describe('esquemaGuardarSecreto', () => {
  const pedido = { clave: 'apibara', secreto: ' una-clave-larga ', actualizadoEnEsperado: version }

  it('recorta los espacios de los bordes', () => {
    expect(esquemaGuardarSecreto.parse(pedido).secreto).toBe('una-clave-larga')
  })

  it('rechaza una clave corta y una integración que no lleva secreto', () => {
    expect(esquemaGuardarSecreto.safeParse({ ...pedido, secreto: 'corta' }).success).toBe(false)
    expect(esquemaGuardarSecreto.safeParse({ ...pedido, clave: 'push_web' }).success).toBe(false)
  })

  it('la web pública también lleva secreto', () => {
    expect(esquemaGuardarSecreto.safeParse({ ...pedido, clave: 'web_publica' }).success).toBe(true)
  })
})

describe('esquemaGuardarWebPublica', () => {
  it('prender o apagar no manda la dirección', () => {
    expect(
      esquemaGuardarWebPublica.parse({ actualizadoEnEsperado: version, activa: true }),
    ).toEqual({
      actualizadoEnEsperado: version,
      activa: true,
    })
  })

  it('una dirección vacía la borra', () => {
    expect(
      esquemaGuardarWebPublica.parse({ actualizadoEnEsperado: version, revalidarUrl: '  ' })
        .revalidarUrl,
    ).toBeNull()
  })

  it('una dirección sin https queda con su error en el primer nivel', () => {
    const leida = esquemaGuardarWebPublica.safeParse({
      actualizadoEnEsperado: version,
      revalidarUrl: 'http://ejemplo.com',
    })
    expect(leida.success ? [] : leida.error.issues.map((problema) => problema.path)).toEqual([
      ['revalidarUrl'],
    ])
  })

  it('acepta una https y el loopback del entorno local', () => {
    const con = (revalidarUrl: string) =>
      esquemaGuardarWebPublica.safeParse({ actualizadoEnEsperado: version, revalidarUrl }).success
    expect(con('https://sitio.com/api/revalidar')).toBe(true)
    expect(con('http://127.0.0.1:4000/api/revalidar')).toBe(true)
    expect(con('https://10.0.0.1/x')).toBe(false)
  })
})
