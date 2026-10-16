import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  hayCambiosEnExtra,
  MAXIMO_DE_TELEFONOS_EXTRA,
  MOTIVO_DE_ETIQUETA_LARGA,
  MOTIVO_DE_TELEFONO_REPETIDO,
  MOTIVO_DE_TOPE_DE_EXTRAS,
  cambioDesde,
  etiquetaDeExtra,
  extrasDesde,
  puedeCambiarTelefonoDeLead,
  validarExtra,
} from './telefonos'

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const OTRO = '9b2c7d1e-1f3a-4b6c-8d4e-2a5f6b7c8d90'

const PRINCIPAL = '59170011002'

function extras(cuantos: number) {
  return Array.from({ length: cuantos }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    telefono: `5917100${String(i).padStart(4, '0')}`,
    etiqueta: null,
  }))
}

const entrada = (
  parcial: Partial<Parameters<typeof validarExtra>[0]> = {},
): Parameters<typeof validarExtra>[0] => ({
  codigoDePais: '+591',
  telefono: '71234567',
  etiqueta: '',
  principal: PRINCIPAL,
  extras: [],
  ...parcial,
})

describe('puedeCambiarTelefonoDeLead', () => {
  const editarPropios: Permisos = [{ clave: 'leads.editar', origenId: null, alcance: 'propios' }]
  const editarTodos: Permisos = [{ clave: 'leads.editar', origenId: null, alcance: 'todos' }]

  it('pide la cartera aunque el alcance sea «todos»', () => {
    expect(puedeCambiarTelefonoDeLead(editarTodos, false)).toBe(false)
    expect(puedeCambiarTelefonoDeLead(editarTodos, true)).toBe(true)
    expect(puedeCambiarTelefonoDeLead(editarPropios, true)).toBe(true)
    expect(puedeCambiarTelefonoDeLead(editarPropios, false)).toBe(false)
  })

  it('sin leads.editar no hay nada que hacer, ni con la cartera', () => {
    expect(puedeCambiarTelefonoDeLead([], true)).toBe(false)
  })
})

describe('hayCambiosEnExtra', () => {
  it('vacío o sólo espacios no son cambios', () => {
    expect(hayCambiosEnExtra({ telefono: '', etiqueta: '' })).toBe(false)
    expect(hayCambiosEnExtra({ telefono: '  ', etiqueta: ' ' })).toBe(false)
  })

  it('un número o una etiqueta escritos sí', () => {
    expect(hayCambiosEnExtra({ telefono: '7001', etiqueta: '' })).toBe(true)
    expect(hayCambiosEnExtra({ telefono: '', etiqueta: 'Casa' })).toBe(true)
  })
})

describe('etiquetaDeExtra', () => {
  it('vacía o de espacios queda nula', () => {
    expect(etiquetaDeExtra('')).toBeNull()
    expect(etiquetaDeExtra('   ')).toBeNull()
    expect(etiquetaDeExtra('  Casa ')).toBe('Casa')
  })
})

describe('validarExtra', () => {
  it('normaliza el número con el código de país y deja la etiqueta opcional', () => {
    expect(validarExtra(entrada())).toEqual({ ok: true, numero: '59171234567', etiqueta: null })
    expect(
      validarExtra(entrada({ telefono: '+54 9 11 5555 1234', etiqueta: ' Trabajo ' })),
    ).toEqual({ ok: true, numero: '5491155551234', etiqueta: 'Trabajo' })
  })

  it('un número que no es un teléfono se dice junto al campo', () => {
    const corto = validarExtra(entrada({ telefono: '123' }))
    expect(corto).toMatchObject({ ok: false })
    expect(corto.ok ? null : corto.porCampo.telefono).toMatch(/faltan dígitos/)
    const letras = validarExtra(entrada({ telefono: '71abc' }))
    expect(letras.ok ? null : letras.porCampo.telefono).toMatch(/sólo lleva números/)
    expect(validarExtra(entrada({ telefono: '' })).ok).toBe(false)
  })

  it('sin código de país y sin «+» no se adivina', () => {
    const res = validarExtra(entrada({ codigoDePais: null }))
    expect(res.ok ? null : res.porCampo.telefono).toMatch(/código de país/)
  })

  it('igual al principal, también escrito con otro formato', () => {
    for (const telefono of ['70011002', '+591 700-11002', '00591 70011002']) {
      const res = validarExtra(entrada({ telefono }))
      expect(res.ok ? null : res.porCampo.telefono).toBe(MOTIVO_DE_TELEFONO_REPETIDO)
    }
  })

  it('igual a otro extra del lead', () => {
    const res = validarExtra(
      entrada({ extras: [{ id: ID, telefono: '59171234567', etiqueta: 'Casa' }] }),
    )
    expect(res.ok ? null : res.porCampo.telefono).toBe(MOTIVO_DE_TELEFONO_REPETIDO)
  })

  it('el número 11 no entra, el 10 sí', () => {
    expect(validarExtra(entrada({ extras: extras(MAXIMO_DE_TELEFONOS_EXTRA - 1) })).ok).toBe(true)
    const res = validarExtra(entrada({ extras: extras(MAXIMO_DE_TELEFONOS_EXTRA) }))
    expect(res.ok ? null : res.porCampo.telefono).toBe(MOTIVO_DE_TOPE_DE_EXTRAS)
  })

  it('la etiqueta admite 40 caracteres y no 41', () => {
    expect(validarExtra(entrada({ etiqueta: 'x'.repeat(40) })).ok).toBe(true)
    const res = validarExtra(entrada({ etiqueta: 'x'.repeat(41) }))
    expect(res.ok ? null : res.porCampo.etiqueta).toBe(MOTIVO_DE_ETIQUETA_LARGA)
  })

  it('rotular no vuelve a mirar el número, aunque haya 10', () => {
    const lista = extras(MAXIMO_DE_TELEFONOS_EXTRA)
    const [primero] = lista
    expect(
      validarExtra(entrada({ extras: lista, rotulando: primero ?? null, etiqueta: 'Casa' })),
    ).toEqual({ ok: true, numero: primero?.telefono, etiqueta: 'Casa' })
    const larga = validarExtra(
      entrada({ extras: lista, rotulando: primero ?? null, etiqueta: 'x'.repeat(41) }),
    )
    expect(larga.ok).toBe(false)
  })
})

describe('cambioDesde', () => {
  const estado = {
    actualizado_en: '2026-10-14T12:00:00.000Z',
    telefono_cc: '+591',
    telefono: '59171234567',
    telefonos: [
      { id: ID, telefono: PRINCIPAL, etiqueta: 'Anterior', creado_en: '2026-10-14T12:00:00Z' },
    ],
  }

  it('lee un cambio y un «sin cambios»', () => {
    expect(cambioDesde({ resultado: 'cambiado', ...estado })).toEqual({
      resultado: 'cambiado',
      actualizadoEn: '2026-10-14T12:00:00.000Z',
      telefonoCc: '+591',
      telefono: '59171234567',
      telefonos: [{ id: ID, telefono: PRINCIPAL, etiqueta: 'Anterior' }],
    })
    expect(cambioDesde({ resultado: 'sin_cambios', ...estado, telefono_cc: null })).toMatchObject({
      resultado: 'sin_cambios',
      telefonoCc: null,
    })
  })

  it('un número que existe llega como valor con su verificación', () => {
    expect(
      cambioDesde({ resultado: 'de_otro', verificacion: { estado: 'de_otro', dueno: 'Diego' } }),
    ).toEqual({ resultado: 'de_otro', verificacion: { estado: 'de_otro', dueno: 'Diego' } })
    expect(cambioDesde({ resultado: 'limbo', verificacion: { estado: 'limbo' } })).toEqual({
      resultado: 'limbo',
      verificacion: { estado: 'limbo' },
    })
  })

  it('una forma que no calza es un error de programación', () => {
    expect(() => cambioDesde({ resultado: 'otro' })).toThrow()
    expect(() => cambioDesde({ resultado: 'cambiado' })).toThrow()
    expect(() => cambioDesde(null)).toThrow()
  })
})

describe('extrasDesde', () => {
  const base = {
    actualizado_en: '2026-10-14T12:00:00.000Z',
    telefono_cc: null,
    telefono: PRINCIPAL,
    telefonos: [],
  }

  it('lee lo agregado, sin quitado', () => {
    expect(extrasDesde({ resultado: 'agregado', ...base })).toEqual({
      resultado: 'agregado',
      actualizadoEn: '2026-10-14T12:00:00.000Z',
      telefonoCc: null,
      telefono: PRINCIPAL,
      telefonos: [],
      quitado: null,
    })
  })

  it('lo quitado trae lo que hace falta para restituirlo', () => {
    const leido = extrasDesde({
      resultado: 'quitado',
      ...base,
      quitado: {
        id: OTRO,
        telefono: '59171234567',
        etiqueta: 'Casa',
        creado_en: '2026-10-13T10:00:00Z',
      },
    })
    expect(leido.quitado).toEqual({
      id: OTRO,
      telefono: '59171234567',
      etiqueta: 'Casa',
      creadoEn: '2026-10-13T10:00:00Z',
    })
  })

  it('quitar lo que no está dice «sin cambios» y no trae nada', () => {
    expect(extrasDesde({ resultado: 'sin_cambios', ...base, quitado: null })).toMatchObject({
      resultado: 'sin_cambios',
      quitado: null,
    })
  })
})
