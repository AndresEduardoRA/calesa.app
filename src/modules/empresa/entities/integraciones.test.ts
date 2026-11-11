import { describe, expect, it } from 'vitest'
import {
  CONFIG_APIBARA_POR_DEFECTO,
  esDireccionDeApibara,
  esDireccionDeRevalidacion,
  esDireccionLocal,
  configDeApibara,
  configDeWebPublica,
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

// «Probar» manda el secreto a esta dirección desde el servidor: lo que apunte adentro de la red
// del servidor no pasa (SSRF). WHATWG normaliza el host antes de mirarlo.
describe('esDireccionDeRevalidacion', () => {
  const conLoopback = { loopback: true }
  const sinLoopback = { loopback: false }

  it.each(['https://sitio.com/api/revalidar', 'https://sitio.com:8443/x', 'HTTPS://Sitio.com/x'])(
    'acepta una https pública: %s',
    (direccion) => {
      expect(esDireccionDeRevalidacion(direccion, sinLoopback)).toBe(true)
      expect(esDireccionDeRevalidacion(direccion, conLoopback)).toBe(true)
    },
  )

  it.each(['http://localhost:4000/x', 'http://127.0.0.1:5555/api', 'https://127.1/x'])(
    'acepta el loopback sólo si se permite: %s',
    (direccion) => {
      expect(esDireccionDeRevalidacion(direccion, conLoopback)).toBe(true)
      expect(esDireccionDeRevalidacion(direccion, sinLoopback)).toBe(false)
    },
  )

  it.each([
    'http://localhost:4000',
    'https://localhost',
    'https://127.0.0.1',
    'https://2130706433',
    'https://0x7f.1',
    'https://127.1',
    'https://localhost./x',
    'https://a.localhost./x',
    'https://A.LocalHost/x',
  ])('sin loopback rechaza %s', (direccion) => {
    expect(esDireccionDeRevalidacion(direccion, sinLoopback)).toBe(false)
  })

  it.each([
    'http://sitio.com',
    'ftp://sitio.com',
    'https://usuario:clave@sitio.com',
    'https://10.0.0.1',
    'https://172.16.5.4',
    'https://172.31.255.255',
    'https://192.168.1.1',
    'https://169.254.169.254',
    'https://100.64.0.1',
    'https://0.0.0.0',
    'https://167772161',
    'https://[::1]',
    'https://[::ffff:10.0.0.1]',
    'no es una dirección',
    `https://sitio.com/${'a'.repeat(2001)}`,
  ])('rechaza siempre %s', (direccion) => {
    expect(esDireccionDeRevalidacion(direccion, conLoopback)).toBe(false)
    expect(esDireccionDeRevalidacion(direccion, sinLoopback)).toBe(false)
  })

  it('una https a una red vecina de las internas pasa', () => {
    expect(esDireccionDeRevalidacion('https://172.32.0.1', sinLoopback)).toBe(true)
    expect(esDireccionDeRevalidacion('https://100.128.0.1', sinLoopback)).toBe(true)
  })
})

describe('esDireccionLocal', () => {
  it('dice si la base del despliegue es la de esta máquina', () => {
    expect(esDireccionLocal('http://127.0.0.1:54621')).toBe(true)
    expect(esDireccionLocal('http://localhost:54621')).toBe(true)
    expect(esDireccionLocal('https://abc.supabase.co')).toBe(false)
    expect(esDireccionLocal('no es una dirección')).toBe(false)
  })
})

describe('configDeWebPublica', () => {
  it('lee la dirección guardada o ninguna', () => {
    expect(configDeWebPublica({ revalidar_url: 'https://sitio.com/x' })).toEqual({
      revalidar_url: 'https://sitio.com/x',
    })
    expect(configDeWebPublica({})).toEqual({ revalidar_url: null })
    expect(configDeWebPublica(null)).toEqual({ revalidar_url: null })
  })
})
