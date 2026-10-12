import { describe, expect, it } from 'vitest'
import {
  CONFIG_APIBARA_POR_DEFECTO,
  esDireccionDeApibara,
  configDeApibara,
  esquemaConfigApibara,
  integracionesDesde,
  puedeActivarse,
} from './integraciones'

const fila = {
  clave: 'apibara',
  activa: false,
  config: { endpoint: 'https://api.apibara.tech', plataformas: ['copart'] },
  secreto_guardado_en: null,
  actualizado_en: '2026-10-12T14:00:00+00:00',
  actualizado_por: null,
}

describe('integracionesDesde', () => {
  it('convierte las filas que conoce e ignora las demás', () => {
    const integraciones = integracionesDesde([fila, { ...fila, clave: 'del_futuro' }])
    expect(integraciones).toHaveLength(1)
    expect(integraciones[0]).toMatchObject({
      clave: 'apibara',
      activa: false,
      secretoGuardadoEn: null,
    })
  })
})

describe('la configuración de apibara', () => {
  it('lee la guardada', () => {
    expect(configDeApibara(fila.config)).toEqual(fila.config)
  })

  it('si no tiene la forma esperada, vale la de fábrica', () => {
    expect(configDeApibara({})).toEqual(CONFIG_APIBARA_POR_DEFECTO)
    expect(configDeApibara(null)).toEqual(CONFIG_APIBARA_POR_DEFECTO)
  })

  it('la dirección sólo puede ser de apibara.tech, por https', () => {
    expect(esDireccionDeApibara('https://api.apibara.tech')).toBe(true)
    expect(esDireccionDeApibara('https://apibara.tech/api/v1')).toBe(true)
    expect(esDireccionDeApibara('http://api.apibara.tech')).toBe(false)
    expect(esDireccionDeApibara('https://atacante.example')).toBe(false)
    expect(esDireccionDeApibara('https://apibara.tech.atacante.example')).toBe(false)
    expect(esDireccionDeApibara('https://atacante.example/apibara.tech')).toBe(false)
    expect(esDireccionDeApibara('https://api.apibara.tech@atacante.example')).toBe(false)
    expect(esDireccionDeApibara('api.apibara.tech')).toBe(false)
  })

  it('exige una dirección https y al menos una plataforma', () => {
    expect(
      esquemaConfigApibara.safeParse({
        endpoint: 'http://api.apibara.tech',
        plataformas: ['copart'],
      }).success,
    ).toBe(false)
    expect(
      esquemaConfigApibara.safeParse({ endpoint: 'api.apibara.tech', plataformas: ['copart'] })
        .success,
    ).toBe(false)
    expect(
      esquemaConfigApibara.safeParse({ endpoint: 'https://api.apibara.tech', plataformas: [] })
        .success,
    ).toBe(false)
    expect(
      esquemaConfigApibara.safeParse({
        endpoint: 'https://api.apibara.tech',
        plataformas: ['otra'],
      }).success,
    ).toBe(false)
    expect(
      esquemaConfigApibara.safeParse({
        endpoint: 'https://api.apibara.tech',
        plataformas: ['iaai'],
      }).success,
    ).toBe(true)
  })
})

describe('puedeActivarse', () => {
  it('apibara necesita su clave guardada', () => {
    expect(puedeActivarse({ clave: 'apibara', secretoGuardadoEn: null })).toBe(false)
    expect(
      puedeActivarse({ clave: 'apibara', secretoGuardadoEn: '2026-10-12T14:00:00+00:00' }),
    ).toBe(true)
  })

  it('las que no llevan secreto se activan sin más', () => {
    expect(puedeActivarse({ clave: 'web_publica', secretoGuardadoEn: null })).toBe(true)
  })
})
