import { describe, expect, it } from 'vitest'
import {
  catalogosDeLeadDesde,
  idsDeLasClaves,
  iconosEnUso,
  nombreDelTipo,
  opcionesDeTipo,
  tipoDelCatalogo,
  tiposOfrecidos,
  type TipoDeLeadEnCatalogo,
} from './catalogos'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const tipo = (n: number, extra: Partial<TipoDeLeadEnCatalogo> = {}): TipoDeLeadEnCatalogo => ({
  id: id(n),
  clave: `t${n}`,
  nombre: `Tipo ${n}`,
  clase: n % 2 === 1 ? 'prospecto' : 'cliente',
  activo: true,
  ...extra,
})
const tipos = [tipo(1), tipo(2, { activo: false }), tipo(3), tipo(4)]

describe('catalogosDeLeadDesde', () => {
  it('lee los orígenes y los tipos de leads_catalogos()', () => {
    const leido = catalogosDeLeadDesde({
      origenes: [{ id: id(9), clave: 'web', nombre: 'Web', icono: 'web', activo: true }],
      tipos: [
        {
          id: id(1),
          clave: 'prospecto',
          nombre: 'Prospecto',
          clase: 'prospecto',
          icono: null,
          activo: true,
        },
      ],
    })
    expect(leido?.origenes).toHaveLength(1)
    expect(leido?.tipos[0]).toMatchObject({ nombre: 'Prospecto', clase: 'prospecto', icono: null })
    expect(leido?.origenes[0]).toMatchObject({ nombre: 'Web', icono: 'web' })
  })

  it('una forma rota, o una clase que no es una de las dos, es nula', () => {
    expect(catalogosDeLeadDesde(null)).toBeNull()
    expect(
      catalogosDeLeadDesde({
        origenes: [],
        tipos: [{ id: id(1), clave: 'x', nombre: 'X', clase: 'otra', icono: null, activo: true }],
      }),
    ).toBeNull()
    expect(catalogosDeLeadDesde({ origenes: [] })).toBeNull()
  })
})

describe('tipoDelCatalogo y nombreDelTipo', () => {
  it('nombran el tipo de un lead por su id', () => {
    expect(tipoDelCatalogo(tipos, id(3))?.nombre).toBe('Tipo 3')
    expect(nombreDelTipo(tipos, id(3))).toBe('Tipo 3')
    expect(nombreDelTipo(tipos, id(99))).toBeNull()
    expect(nombreDelTipo(tipos, null)).toBeNull()
  })
})

describe('tiposOfrecidos', () => {
  it('ofrece los activos y, del lead, el apagado que ya tiene', () => {
    expect(tiposOfrecidos(tipos, null).map((t) => t.id)).toEqual([id(1), id(3), id(4)])
    expect(tiposOfrecidos(tipos, id(2))).toEqual([
      { id: id(1), nombre: 'Tipo 1', activo: true },
      { id: id(2), nombre: 'Tipo 2', activo: false },
      { id: id(3), nombre: 'Tipo 3', activo: true },
      { id: id(4), nombre: 'Tipo 4', activo: true },
    ])
  })
})

describe('opcionesDeTipo', () => {
  it('primero los activos y después los apagados «(inactivo)», con la clave como valor', () => {
    expect(opcionesDeTipo(tipos)).toEqual([
      { valor: 't1', etiqueta: 'Tipo 1' },
      { valor: 't3', etiqueta: 'Tipo 3' },
      { valor: 't4', etiqueta: 'Tipo 4' },
      { valor: 't2', etiqueta: 'Tipo 2 (inactivo)' },
    ])
  })
})

describe('idsDeLasClaves', () => {
  it('traduce las claves de la URL a ids, y descarta la que ya no está', () => {
    expect(idsDeLasClaves(tipos, ['t3', 't1'])).toEqual([id(1), id(3)])
    expect(idsDeLasClaves(tipos, ['borrado'])).toEqual([])
    expect(idsDeLasClaves(tipos, [])).toEqual([])
  })
})

describe('iconosEnUso', () => {
  const origenes = [{ id: id(1), icono: 'web' }, { id: id(2), icono: null }, { id: id(3) }]
  const tiposDeIcono = [
    { id: id(11), icono: 'persona' },
    { id: id(12), icono: 'web' },
    { id: id(13), icono: '  ' },
  ]

  it('junta, sin repetir, las claves del origen y del tipo de cada fila', () => {
    const filas = [
      { origenId: id(1), tipoLeadId: id(11) },
      { origenId: id(1), tipoLeadId: id(12) },
      { origenId: id(2), tipoLeadId: id(11) },
    ]
    expect(iconosEnUso(filas, origenes, tiposDeIcono).sort()).toEqual(['persona', 'web'])
  })

  it('lo que no tiene icono, un lead sin origen o un id que no está no suman nada', () => {
    const filas = [
      { origenId: id(2), tipoLeadId: id(13) },
      { origenId: id(3), tipoLeadId: id(99) },
      { origenId: null, tipoLeadId: id(99) },
    ]
    expect(iconosEnUso(filas, origenes, tiposDeIcono)).toEqual([])
    expect(iconosEnUso([], origenes, tiposDeIcono)).toEqual([])
  })

  it('una clave que el catálogo no conoce también se lleva (la lista monta el símbolo neutro)', () => {
    expect(
      iconosEnUso(
        [{ origenId: id(1), tipoLeadId: id(11) }],
        [{ id: id(1), icono: 'marciano' }],
        [],
      ),
    ).toEqual(['marciano'])
  })
})
