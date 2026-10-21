import { describe, expect, it } from 'vitest'
import { CLAVE_DEL_ALTA, valoresIniciales, validarAlta, type ContextoDeAlta } from './alta'

// El tipo de lead del alta (9j): lo propone la base y sólo valen los activos que ofreció.
const ZONA = 'America/La_Paz'
const TIPO_PRO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const TIPO_CLI = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const ORIGEN = '11111111-1111-4111-8111-111111111111'

const CONTEXTO: ContextoDeAlta = {
  telefonoCc: '+591',
  origenes: [{ id: ORIGEN, nombre: 'Web' }],
  tipos: [
    { id: TIPO_PRO, nombre: 'Prospecto', clase: 'prospecto' },
    { id: TIPO_CLI, nombre: 'Cliente', clase: 'cliente' },
  ],
  tipoPorDefectoId: TIPO_PRO,
  tiposDeSeguimiento: [],
  ultimoOrigenId: null,
  origenPorDefectoId: null,
  topes: { origenes: 100, tipos: 100, tiposDeSeguimiento: 100 },
  empresa: { ciudad: null, pais: null },
}

const entrada = (tipo: string, contexto = CONTEXTO) => ({
  valores: {
    ...valoresIniciales(contexto, [], ZONA),
    [CLAVE_DEL_ALTA.telefono]: '70011002',
    [CLAVE_DEL_ALTA.nombre]: 'Ana',
    [CLAVE_DEL_ALTA.tipo]: tipo,
  },
  layout: [],
  contexto,
  zona: ZONA,
})

describe('el tipo con el que arranca el alta', () => {
  it('el que propone la base; sin él, el primero activo; y sin ninguno, vacío', () => {
    expect(valoresIniciales(CONTEXTO, [], ZONA)[CLAVE_DEL_ALTA.tipo]).toBe(TIPO_PRO)
    const sinDefecto = { ...CONTEXTO, tipoPorDefectoId: null }
    expect(valoresIniciales(sinDefecto, [], ZONA)[CLAVE_DEL_ALTA.tipo]).toBe(TIPO_PRO)
    expect(valoresIniciales({ ...sinDefecto, tipos: [] }, [], ZONA)[CLAVE_DEL_ALTA.tipo]).toBe('')
  })
})

describe('validar el tipo del alta', () => {
  it('uno de los que ofreció la base pasa, con su id', () => {
    const r = validarAlta(entrada(TIPO_CLI))
    expect(r.ok && r.datos.tipoLeadId).toBe(TIPO_CLI)
  })

  it('uno que no se ofrece (se apagó, o nunca estuvo) o ninguno pide elegir', () => {
    for (const malo of ['', 'marciano', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd']) {
      expect(validarAlta(entrada(malo))).toEqual({
        ok: false,
        porCampo: { [CLAVE_DEL_ALTA.tipo]: 'Elige el tipo de lead.' },
      })
    }
  })
})
