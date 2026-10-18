import { describe, expect, it } from 'vitest'
import type { TipoDeLeadEnCatalogo } from './catalogos'
import type { CampoDeLead } from './campo'
import { CLAVE_DE_EDICION, camposEditables, validarEdicion, valoresDeEdicion } from './edicion'
import type { LeadDeFicha, OrigenConEstado } from './ficha'
import { SIN_MARCAS } from './marcas'

// El tipo de lead al editar la ficha (9j): sale de la base, y uno apagado que el lead ya tiene se conserva.
const ZONA = 'America/La_Paz'
const WEB = '11111111-1111-4111-8111-111111111111'
const TIPO_PROSPECTO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const TIPO_CLIENTE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const TIPO_APAGADO = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'

const ORIGENES: OrigenConEstado[] = [{ id: WEB, clave: 'web', nombre: 'Web', activo: true }]
const TIPOS: TipoDeLeadEnCatalogo[] = [
  { id: TIPO_PROSPECTO, clave: 'prospecto', nombre: 'Prospecto', clase: 'prospecto', activo: true },
  { id: TIPO_CLIENTE, clave: 'cliente', nombre: 'Cliente', clase: 'cliente', activo: true },
  { id: TIPO_APAGADO, clave: 'viejo', nombre: 'Mayorista', clase: 'cliente', activo: false },
]
const LAYOUT: CampoDeLead[] = []

const FICHA: LeadDeFicha = {
  id: '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11',
  numeros: { numero: 12, numeroPropio: null, creadorDelPropio: null },
  nombre: 'Ana Rojas',
  telefonoCc: '+591',
  telefono: '59170011002',
  enCartera: true,
  tipoLeadId: TIPO_PROSPECTO,
  origenId: WEB,
  atributos: {},
  creadoEn: '2026-10-14T10:00:00Z',
  actualizadoEn: '2026-10-14T10:05:00Z',
  tieneId: null,
  tieneNombre: null,
  telefonos: [],
  recordatoriosVencidos: 0,
  vehiculosVinculados: 0,
  marcas: SIN_MARCAS,
}

function entrada(cambios: Record<string, string> = {}, ficha: LeadDeFicha = FICHA) {
  const campos = camposEditables(LAYOUT, ficha.enCartera)
  const iniciales = valoresDeEdicion(ficha, campos, ZONA)
  return {
    ficha,
    valores: { ...iniciales, ...cambios },
    iniciales,
    campos,
    origenes: ORIGENES,
    tipos: TIPOS,
    zona: ZONA,
  }
}

describe('el tipo al editar la ficha', () => {
  const clave = CLAVE_DE_EDICION.tipo

  it('arranca con el del lead, y cambiarlo viaja como id', () => {
    expect(valoresDeEdicion(FICHA, [], ZONA)[clave]).toBe(TIPO_PROSPECTO)
    expect(validarEdicion(entrada({ [clave]: TIPO_CLIENTE }))).toEqual({
      ok: true,
      cambios: { tipoLeadId: TIPO_CLIENTE },
    })
  })

  it('uno que no existe, uno apagado o ninguno no pasan, y lo dicen junto al campo', () => {
    expect(validarEdicion(entrada({ [clave]: 'marciano' }))).toEqual({
      ok: false,
      porCampo: { [clave]: 'Ese tipo de lead ya no existe: elige otro.' },
    })
    expect(validarEdicion(entrada({ [clave]: TIPO_APAGADO }))).toEqual({
      ok: false,
      porCampo: { [clave]: 'Ese tipo de lead se desactivó: elige otro.' },
    })
    expect(validarEdicion(entrada({ [clave]: '' }))).toEqual({
      ok: false,
      porCampo: { [clave]: 'Elige el tipo de lead.' },
    })
  })

  it('el apagado que el lead ya tiene se conserva al editar lo demás', () => {
    const conApagado: LeadDeFicha = { ...FICHA, tipoLeadId: TIPO_APAGADO }
    expect(validarEdicion(entrada({ nombre: 'Otro' }, conApagado))).toEqual({
      ok: true,
      cambios: { nombre: 'Otro' },
    })
  })
})
