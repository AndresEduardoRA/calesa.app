import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  accesoDesde,
  accesoVigente,
  motivoDeClave,
  otorgadoDesde,
  PANEL_OTORGAR_PORTAL,
  PANEL_REVOCAR_PORTAL,
  puedeGestionarPortal,
  versionDelAcceso,
} from './portal'

const ACTIVO = {
  estado: 'activo',
  codigo: 'MII-4F2K9',
  otorgado_en: '2026-10-16T14:00:00.123+00:00',
  otorgado_por: { nombre: 'Rosa Mamani', de_baja: false },
  ultimo_ingreso_en: null,
  debe_cambiar_clave: true,
  bloqueado_hasta: null,
  revocado_en: null,
  revocado_por: null,
}

describe('accesoDesde', () => {
  it('sin acceso es sólo el estado', () => {
    expect(accesoDesde({ estado: 'sin_acceso' })).toEqual({ estado: 'sin_acceso' })
  })
  it('lee el acceso con quién lo otorgó', () => {
    expect(accesoDesde(ACTIVO)).toEqual({
      estado: 'activo',
      codigo: 'MII-4F2K9',
      otorgadoEn: '2026-10-16T14:00:00.123+00:00',
      otorgadoPor: { nombre: 'Rosa Mamani', deBaja: false },
      ultimoIngresoEn: null,
      debeCambiarClave: true,
      bloqueadoHasta: null,
      revocadoEn: null,
      revocadoPor: null,
    })
  })
  it('la cuenta borrada es una persona nula', () => {
    expect(accesoDesde({ ...ACTIVO, otorgado_por: null })).toMatchObject({ otorgadoPor: null })
  })
  it('una forma rota o un estado que no existe es null', () => {
    expect(accesoDesde(null)).toBeNull()
    expect(accesoDesde({ estado: 'activo' })).toBeNull()
    expect(accesoDesde({ ...ACTIVO, estado: 'pausado' })).toBeNull()
  })
})

describe('la versión y si está vigente', () => {
  it('sin acceso la versión esperada es nula; con acceso, su otorgado_en tal cual', () => {
    expect(versionDelAcceso({ estado: 'sin_acceso' })).toBeNull()
    const acceso = accesoDesde(ACTIVO)
    expect(acceso && versionDelAcceso(acceso)).toBe('2026-10-16T14:00:00.123+00:00')
  })
  it('activo y bloqueado están vigentes; revocado, sin acceso y desconocido no', () => {
    expect(accesoVigente(accesoDesde(ACTIVO))).toBe(true)
    expect(accesoVigente(accesoDesde({ ...ACTIVO, estado: 'bloqueado' }))).toBe(true)
    expect(accesoVigente(accesoDesde({ ...ACTIVO, estado: 'revocado' }))).toBe(false)
    expect(accesoVigente({ estado: 'sin_acceso' })).toBe(false)
    expect(accesoVigente(null)).toBe(false)
  })
})

describe('otorgadoDesde', () => {
  it('con la clave generada, y sin ella si la escribió la persona', () => {
    expect(
      otorgadoDesde({
        codigo: 'MII-4F2K9',
        otorgado_en: '2026-10-16T14:00:00Z',
        clave: 'ABCDEFGH23',
      }),
    ).toEqual({ codigo: 'MII-4F2K9', otorgadoEn: '2026-10-16T14:00:00Z', clave: 'ABCDEFGH23' })
    expect(otorgadoDesde({ codigo: 'MII-4F2K9', otorgado_en: '2026-10-16T14:00:00Z' })).toEqual({
      codigo: 'MII-4F2K9',
      otorgadoEn: '2026-10-16T14:00:00Z',
      clave: null,
    })
  })
  it('una forma rota es null', () => {
    expect(otorgadoDesde({ codigo: 'MII-4F2K9' })).toBeNull()
  })
})

describe('puedeGestionarPortal', () => {
  const con = (alcance: 'propios' | 'todos'): Permisos => [
    { clave: 'leads.portal.gestionar', origenId: null, alcance },
  ]
  it('con la cartera y el permiso, con cualquier alcance', () => {
    expect(puedeGestionarPortal(con('propios'), true)).toBe(true)
    expect(puedeGestionarPortal(con('todos'), true)).toBe(true)
  })
  it('sin la cartera no, aunque vea «todos»; sin el permiso tampoco', () => {
    expect(puedeGestionarPortal(con('todos'), false)).toBe(false)
    expect(
      puedeGestionarPortal([{ clave: 'leads.editar', origenId: null, alcance: 'todos' }], true),
    ).toBe(false)
  })
  it('los paneles tienen su valor de ?panel=', () => {
    expect([PANEL_OTORGAR_PORTAL, PANEL_REVOCAR_PORTAL]).toEqual([
      'otorgar-portal',
      'revocar-portal',
    ])
  })
})

describe('motivoDeClave (espejo de _portal_clave_validar)', () => {
  it('de 8 a 64 caracteres; ocho espacios también (no se recorta)', () => {
    expect(motivoDeClave('corta')).toBe('La clave necesita al menos 8 caracteres.')
    expect(motivoDeClave('a'.repeat(8))).toBeNull()
    expect(motivoDeClave(' '.repeat(8))).toBeNull()
    expect(motivoDeClave('a'.repeat(64))).toBeNull()
    expect(motivoDeClave('a'.repeat(65))).toBe('La clave puede tener hasta 64 caracteres.')
  })
  it('cuenta caracteres, no bytes, para el largo; y hasta 72 bytes', () => {
    expect(motivoDeClave('ñandú-26')).toBeNull()
    expect(motivoDeClave('ñ'.repeat(36))).toBeNull()
    expect(motivoDeClave('ñ'.repeat(37))).toBe(
      'La clave es demasiado larga: usa menos tildes o símbolos.',
    )
  })
  it('sin caracteres de control', () => {
    expect(motivoDeClave('clave-con\ttab')).toBe(
      'La clave no puede llevar saltos de línea ni tabulaciones.',
    )
    expect(motivoDeClave('clave\ncon salto')).not.toBeNull()
    expect(motivoDeClave('Ñandú-2026 ✓ clave')).toBeNull()
  })
})
