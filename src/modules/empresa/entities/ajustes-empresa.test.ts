import { describe, expect, it } from 'vitest'
import type { Tables } from '@/shared/types/database.types'
import { ajustesEmpresaDesde, cambiosComoColumnas, huellaDelFormulario } from './ajustes-empresa'

const fila: Tables<'ajustes_empresa'> = {
  id: 1,
  nombre: 'Importadora Andina',
  razon_social: 'Andina SRL',
  nit: '1020304050',
  direccion: null,
  ciudad: 'Santa Cruz',
  pais: 'Bolivia',
  telefono: null,
  whatsapp: '+59170000000',
  email: null,
  logo_ruta: null,
  logo_oscuro_ruta: null,
  iconos: null,
  color_acento: '#0b7285',
  locale: 'es-BO',
  zona_horaria: 'America/La_Paz',
  moneda_base: 'USD',
  registro_abierto: false,
  papelera_dias: 30,
  actividad_dias: 14,
  demora_dias_default: 7,
  lead_dormido_meses: 3,
  limpieza_automatica: true,
  limpieza_dias_gracia: 7,
  actualizado_en: '2026-10-12T14:00:00.123456+00:00',
  actualizado_por: null,
}

describe('ajustesEmpresaDesde', () => {
  it('convierte la fila con su versión', () => {
    const ajustes = ajustesEmpresaDesde(fila)
    expect(ajustes.razonSocial).toBe('Andina SRL')
    expect(ajustes.papeleraDias).toBe(30)
    expect(ajustes.iconos).toBeNull()
    expect(ajustes.actualizadoEn).toBe('2026-10-12T14:00:00.123456+00:00')
  })
})

describe('cambiosComoColumnas', () => {
  it('nombra las columnas y manda sólo lo que cambia', () => {
    expect(cambiosComoColumnas({ razonSocial: 'Andina SA', papeleraDias: 45 })).toEqual({
      razon_social: 'Andina SA',
      papelera_dias: 45,
    })
  })

  it('la limpieza automática viaja con los nombres de la base', () => {
    expect(cambiosComoColumnas({ limpiezaAutomatica: false, limpiezaDiasGracia: 10 })).toEqual({
      limpieza_automatica: false,
      limpieza_dias_gracia: 10,
    })
  })

  it('un null viaja (vaciar); un undefined no (no tocar)', () => {
    expect(cambiosComoColumnas({ logoRuta: null, nit: undefined, registroAbierto: false })).toEqual(
      {
        logo_ruta: null,
        registro_abierto: false,
      },
    )
  })

  it('sin cambios no manda nada', () => {
    expect(cambiosComoColumnas({})).toEqual({})
  })
})

describe('huellaDelFormulario', () => {
  const ajustes = ajustesEmpresaDesde(fila)

  it('cambia cuando cambia algo de lo que el formulario edita', () => {
    expect(huellaDelFormulario({ ...ajustes, nombre: 'Otra' })).not.toBe(
      huellaDelFormulario(ajustes),
    )
    expect(huellaDelFormulario({ ...ajustes, logoRuta: 'logos/x.png' })).not.toBe(
      huellaDelFormulario(ajustes),
    )
  })

  it('no cambia si sólo se regeneraron los íconos o se movió la versión', () => {
    const conIconos = {
      ...ajustes,
      actualizadoEn: '2026-10-13T09:00:00+00:00',
      iconos: { '32': 'a', '180': 'b', '192': 'c', '512': 'd', '512m': 'e' },
    }
    expect(huellaDelFormulario(conIconos)).toBe(huellaDelFormulario(ajustes))
  })
})
