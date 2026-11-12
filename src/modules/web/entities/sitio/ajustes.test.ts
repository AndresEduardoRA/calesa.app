import { describe, expect, it } from 'vitest'
import {
  ajustesDelSitioDesde,
  avisoDeOrigenApagado,
  cambiosDeAjustes,
  origenesAGuardar,
  type EntradaDeCambios,
} from './ajustes'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'
const INACTIVO = '44444444-4444-4444-8444-444444444444'

const entrada: EntradaDeCambios = {
  nombreSitio: '  Autos del Sur ',
  lema: '',
  direccionPublica: 'https://autosdelsur.bo',
  whatsappRespaldo: '   ',
  horario: 'Lunes a viernes de 9 a 18',
  facebook: 'https://facebook.com/autosdelsur',
  instagram: '',
  tiktok: ' ',
  youtube: '',
  x: '',
  linkedin: '',
  seoTitulo: 'Autos del Sur',
  seoDescripcion: '',
  mostrarMonedaSecundaria: true,
  origenesVisibles: [A, B],
}

describe('origenesAGuardar', () => {
  it('conserva un origen guardado que la lista no muestra (inactivo): no se cae de la web sin que nadie lo vea', () => {
    expect(origenesAGuardar([A, INACTIVO], [A, B], [A, B])).toEqual([A, INACTIVO, B])
  })

  it('destildar uno mostrado lo saca; tildar uno nuevo lo suma, sin repetir', () => {
    expect(origenesAGuardar([A, B], [A, B, C], [B, C, C])).toEqual([B, C])
    expect(origenesAGuardar([A, INACTIVO], [A], [])).toEqual([INACTIVO])
  })
})

describe('cambiosDeAjustes', () => {
  it('manda exactamente las claves del sitio que edita la pestaña: nunca legales ni la cola', () => {
    expect(Object.keys(cambiosDeAjustes(entrada)).sort()).toEqual(
      [
        'direccion_publica',
        'horario',
        'lema',
        'mostrar_moneda_secundaria',
        'nombre_sitio',
        'origenes_visibles',
        'redes',
        'seo',
        'whatsapp_respaldo',
      ].sort(),
    )
  })

  it('un texto vacío va como null y redes y seo sin las claves vacías', () => {
    expect(cambiosDeAjustes(entrada)).toEqual({
      nombre_sitio: 'Autos del Sur',
      lema: null,
      direccion_publica: 'https://autosdelsur.bo',
      whatsapp_respaldo: null,
      horario: 'Lunes a viernes de 9 a 18',
      redes: { facebook: 'https://facebook.com/autosdelsur' },
      seo: { titulo: 'Autos del Sur' },
      mostrar_moneda_secundaria: true,
      origenes_visibles: [A, B],
    })
  })
})

describe('avisoDeOrigenApagado', () => {
  it('sin vehículos publicados no avisa', () => {
    expect(avisoDeOrigenApagado('Corea', { n: 0, hayMas: false })).toBeNull()
  })

  it('dice cuántos dejan de verse, acotado', () => {
    expect(avisoDeOrigenApagado('Corea', { n: 1, hayMas: false })).toBe(
      'Al guardar, deja de verse en la web 1 vehículo publicado de Corea.',
    )
    expect(avisoDeOrigenApagado('Corea', { n: 7, hayMas: false })).toBe(
      'Al guardar, dejan de verse en la web 7 vehículos publicados de Corea.',
    )
    expect(avisoDeOrigenApagado('Corea', { n: 50, hayMas: true })).toBe(
      'Al guardar, dejan de verse en la web más de 50 vehículos publicados de Corea.',
    )
  })

  it('si el conteo no se pudo leer, avisa sin número', () => {
    expect(avisoDeOrigenApagado('Corea', null)).toBe(
      'Al guardar, los vehículos publicados de Corea dejan de verse en la web.',
    )
  })
})

describe('ajustesDelSitioDesde', () => {
  it('lee redes y seo ignorando claves ajenas y lo que no es texto', () => {
    const ajustes = ajustesDelSitioDesde({
      nombre_sitio: null,
      lema: 'Lema',
      whatsapp_respaldo: null,
      horario: null,
      direccion_publica: null,
      redes: { facebook: 'https://f.com/x', otra: 'https://o.com', x: 3 },
      seo: { titulo: 'T', extra: 'no' },
      mostrar_moneda_secundaria: false,
      origenes_visibles: [A],
      actualizado_en: '2026-11-12T10:00:00.123456+00:00',
    })
    expect(ajustes.redes).toEqual({ facebook: 'https://f.com/x' })
    expect(ajustes.seo).toEqual({ titulo: 'T' })
    expect(ajustes.actualizadoEn).toBe('2026-11-12T10:00:00.123456+00:00')
  })
})
