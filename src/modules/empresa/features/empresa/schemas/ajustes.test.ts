import { describe, expect, it } from 'vitest'
import { esquemaAjustes, type EntradaDeAjustes } from './ajustes'

const valida: EntradaDeAjustes = {
  nombre: '  Importadora Andina ',
  colorAcento: '#0B7285',
  razonSocial: '',
  nit: ' 1020304050 ',
  direccion: '',
  ciudad: 'Santa Cruz',
  telefono: '',
  whatsapp: '',
  email: '',
  pais: 'Bolivia',
  locale: 'es-bo',
  zonaHoraria: 'America/La_Paz',
  monedaBase: 'USD',
  registroAbierto: false,
  papeleraDias: 30,
  actividadDias: 14,
  limpiezaAutomatica: true,
  limpiezaDiasGracia: 7,
  actualizadoEnEsperado: '2026-10-12T14:00:00+00:00',
}

function errorDe(entrada: Partial<EntradaDeAjustes>, campo: string): string | undefined {
  const leida = esquemaAjustes.safeParse({ ...valida, ...entrada })
  return leida.success
    ? undefined
    : leida.error.issues.find((problema) => problema.path[0] === campo)?.message
}

describe('esquemaAjustes', () => {
  it('limpia los textos, deja vacío como «sin dato» y normaliza locale y color', () => {
    const leida = esquemaAjustes.parse(valida)
    expect(leida.nombre).toBe('Importadora Andina')
    expect(leida.razonSocial).toBeNull()
    expect(leida.nit).toBe('1020304050')
    expect(leida.email).toBeNull()
    expect(leida.locale).toBe('es-BO')
    expect(leida.colorAcento).toBe('#0b7285')
  })

  it('sin color vale: quedan los colores neutros', () => {
    expect(esquemaAjustes.parse({ ...valida, colorAcento: '' }).colorAcento).toBeNull()
  })

  it('un color sin contraste se rechaza con su motivo', () => {
    expect(errorDe({ colorAcento: '#ff0000' }, 'colorAcento')).toContain('hace falta 4,5:1')
  })

  it('locale y zona horaria se validan contra Intl', () => {
    expect(errorDe({ locale: 'boliviano' }, 'locale')).toContain('formato regional')
    expect(errorDe({ zonaHoraria: 'Marte/Olympus' }, 'zonaHoraria')).toContain('zona horaria')
    expect(errorDe({ zonaHoraria: 'America/Santiago' }, 'zonaHoraria')).toBeUndefined()
  })

  it('el logo: sin clave no se toca, null lo quita, y sólo vale una ruta de logos', () => {
    expect(esquemaAjustes.parse(valida).logoRuta).toBeUndefined()
    expect(esquemaAjustes.parse({ ...valida, logoRuta: null }).logoRuta).toBeNull()
    expect(errorDe({ logoRuta: 'iconos/x.png' }, 'logoRuta')).toBe('El logo no se subió bien.')
    expect(errorDe({ logoRuta: `logos/${'a'.repeat(64)}.svg` }, 'logoRuta')).toBeUndefined()
  })

  it('la retención va de 1 a 365 días enteros', () => {
    expect(errorDe({ papeleraDias: 0 }, 'papeleraDias')).toBe('Como mínimo, 1 día.')
    expect(errorDe({ actividadDias: 366 }, 'actividadDias')).toBe('Como máximo, 365 días.')
    expect(errorDe({ papeleraDias: 1.5 }, 'papeleraDias')).toContain('sin decimales')
    expect(errorDe({ papeleraDias: Number.NaN }, 'papeleraDias')).toBe('Escribe un número de días.')
  })

  it('los días de gracia de la limpieza van de 1 a 90 días enteros', () => {
    expect(errorDe({ limpiezaDiasGracia: 0 }, 'limpiezaDiasGracia')).toBe('Como mínimo, 1 día.')
    expect(errorDe({ limpiezaDiasGracia: 91 }, 'limpiezaDiasGracia')).toBe('Como máximo, 90 días.')
    expect(errorDe({ limpiezaDiasGracia: 2.5 }, 'limpiezaDiasGracia')).toContain('sin decimales')
    expect(errorDe({ limpiezaDiasGracia: 7 }, 'limpiezaDiasGracia')).toBeUndefined()
    expect(errorDe({ limpiezaDiasGracia: 90 }, 'limpiezaDiasGracia')).toBeUndefined()
  })

  it('exige nombre, país y un correo con forma de correo', () => {
    expect(errorDe({ nombre: ' ' }, 'nombre')).toBe('Escribe el nombre de la empresa.')
    expect(errorDe({ pais: '' }, 'pais')).toBe('Escribe el país.')
    expect(errorDe({ email: 'ventas' }, 'email')).toBe('Ese correo no parece válido.')
  })

  it('la moneda base puede no viajar (con datos cargados no se cambia)', () => {
    const { monedaBase: _sinMoneda, ...sinMoneda } = valida
    expect(esquemaAjustes.parse(sinMoneda).monedaBase).toBeUndefined()
  })
})
