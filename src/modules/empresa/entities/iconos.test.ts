import { describe, expect, it } from 'vitest'
import {
  ICONOS,
  claveDeIconoVigente,
  colorDeFondo,
  encuadreDeIcono,
  iconosDelManifest,
  iconosDesde,
  urlDeIcono,
  type EspecificacionDeIcono,
  type Iconos,
} from './iconos'

const hash = 'a'.repeat(64)
const propios: Iconos = {
  '32': `iconos/${hash}.png`,
  '180': `iconos/${hash}.png`,
  '192': `iconos/${hash}.png`,
  '512': `iconos/${hash}.png`,
  '512m': `iconos/${hash}.png`,
}
const urlDe = (ruta: string) => `https://storage.test/marca/${ruta}`

function icono(clave: string): EspecificacionDeIcono {
  const encontrado = ICONOS.find((uno) => uno.clave === clave)
  if (!encontrado) {
    throw new Error(`no existe el ícono ${clave}`)
  }
  return encontrado
}

describe('iconosDesde', () => {
  it('acepta el juego completo de rutas', () => {
    expect(iconosDesde(propios)).toEqual(propios)
  })

  it('sin íconos, incompletos o con rutas ajenas valen los neutros', () => {
    expect(iconosDesde(null)).toBeNull()
    expect(iconosDesde({ '192': `iconos/${hash}.png` })).toBeNull()
    expect(iconosDesde({ ...propios, '512': 'logos/otro.png' })).toBeNull()
    expect(iconosDesde({ ...propios, '512': '../secreto.png' })).toBeNull()
  })
})

describe('colorDeFondo', () => {
  it('usa el color de la empresa, o el neutro si no cargó uno', () => {
    expect(colorDeFondo('marca', '#0b7285')).toBe('#0b7285')
    expect(colorDeFondo('marca', null)).toBe('#3b5bdb')
    expect(colorDeFondo('blanco', '#0b7285')).toBe('#ffffff')
  })
})

describe('encuadreDeIcono', () => {
  it('centra el logo sin deformarlo', () => {
    const { logo } = encuadreDeIcono(icono('192'), { ancho: 400, alto: 200 })
    expect(logo.ancho / logo.alto).toBeCloseTo(2, 5)
    expect(logo.x + logo.ancho / 2).toBeCloseTo(96, 5)
    expect(logo.y + logo.alto / 2).toBeCloseTo(96, 5)
  })

  it('en el enmascarable el logo queda dentro de la zona segura', () => {
    const lado = 512
    const { logo, radio } = encuadreDeIcono(icono('512m'), { ancho: 300, alto: 300 })
    const esquina = Math.hypot(logo.x - lado / 2, logo.y - lado / 2)
    expect(esquina).toBeLessThanOrEqual(lado * 0.4)
    expect(radio).toBe(0)
  })

  it('el de iOS va a sangre y los demás con las esquinas redondeadas', () => {
    expect(encuadreDeIcono(icono('180'), { ancho: 10, alto: 10 }).radio).toBe(0)
    expect(encuadreDeIcono(icono('512'), { ancho: 10, alto: 10 }).radio).toBeGreaterThan(0)
  })

  it('un logo sin medidas no rompe el cálculo', () => {
    const { logo } = encuadreDeIcono(icono('32'), { ancho: 0, alto: 0 })
    expect(Number.isFinite(logo.x) && Number.isFinite(logo.ancho)).toBe(true)
  })
})

describe('urlDeIcono e iconosDelManifest', () => {
  it('sin íconos propios, los neutros de public/', () => {
    expect(urlDeIcono(null, '32', urlDe)).toBe('/iconos/icono-32.png')
    expect(urlDeIcono(null, '180', urlDe)).toBe('/apple-touch-icon.png')
    expect(iconosDelManifest(null, urlDe).map((uno) => uno.src)).toEqual([
      '/iconos/icono-192.png',
      '/iconos/icono-512.png',
      '/iconos/icono-512-maskable.png',
    ])
  })

  it('con íconos propios, los de Storage, y el enmascarable declarado como tal', () => {
    const delManifest = iconosDelManifest(propios, urlDe)
    expect(
      delManifest.every((uno) => uno.src.startsWith('https://storage.test/marca/iconos/')),
    ).toBe(true)
    expect(delManifest.filter((uno) => uno.purpose === 'maskable')).toHaveLength(1)
  })
})

describe('claveDeIconoVigente', () => {
  it('sólo los tamaños que enlaza el documento', () => {
    expect(claveDeIconoVigente('32')).toBe('32')
    expect(claveDeIconoVigente('180')).toBe('180')
    expect(claveDeIconoVigente('512')).toBeNull()
    expect(claveDeIconoVigente('../x')).toBeNull()
  })
})
