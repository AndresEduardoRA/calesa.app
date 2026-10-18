import { describe, expect, it } from 'vitest'
import type { ContextoDeAlta } from '../alta'
import { motivoDeTipoDesconocido, prepararFilas, type EntradaDePreparacion } from './filas'

// El tipo de lead de una fila del CSV (9j): sale de los tipos activos de la base —por nombre o por clave—, nunca de un texto fijo.
const WEB = '11111111-1111-4111-8111-111111111111'
const TIPO_PRO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const TIPO_CLI = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const TIPO_VIP = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

// Sólo los activos, en su orden (como los entrega el alta).
const TIPOS = [
  { id: TIPO_PRO, clave: 'prospecto', nombre: 'Prospecto', clase: 'prospecto' as const },
  { id: TIPO_CLI, clave: 'cliente', nombre: 'Cliente', clase: 'cliente' as const },
  { id: TIPO_VIP, clave: 'vip', nombre: 'Cliente VIP', clase: 'cliente' as const },
]

const CONTEXTO: ContextoDeAlta = {
  telefonoCc: '+591',
  origenes: [{ id: WEB, clave: 'web', nombre: 'Web' }],
  tipos: TIPOS,
  tipoPorDefectoId: TIPO_PRO,
  tiposDeSeguimiento: [],
  ultimoOrigenId: null,
  empresa: { ciudad: null, pais: null },
}

function preparar(filas: string[][], extra: Partial<EntradaDePreparacion> = {}) {
  let n = 0
  return prepararFilas({
    filas,
    destinos: ['nombre', 'telefono_principal', 'tipo_lead_id'],
    campos: [],
    contexto: CONTEXTO,
    zona: 'America/La_Paz',
    eleccion: { origenId: WEB, tipoLeadId: TIPO_PRO },
    nuevoId: () => `id-${String((n += 1))}`,
    ...extra,
  })
}

const celda = (tipo: string, telefono = '70011002') => ['Ana', telefono, tipo]

describe('el tipo de una fila del CSV', () => {
  it('se nombra por su nombre o su clave, sin tildes ni mayúsculas, y cualquier tipo activo vale', () => {
    const [porNombre, porClave, porOtro] = preparar([
      celda('  CLIENTE vip '),
      celda('Cliente', '70011003'),
      celda('prospecto', '70011004'),
    ])
    expect(porNombre?.pedido?.lead.tipo_lead_id).toBe(TIPO_VIP)
    expect(porClave?.pedido?.lead.tipo_lead_id).toBe(TIPO_CLI)
    expect(porOtro?.pedido?.lead.tipo_lead_id).toBe(TIPO_PRO)
  })

  it('uno que no existe o está apagado es un error de esa fila, lista los activos y no se crea', () => {
    const [fila] = preparar([celda('Mayorista')])
    expect(fila?.pedido).toBeNull()
    expect(fila?.motivos).toEqual([
      {
        campo: 'tipo_lead_id',
        motivo:
          'El tipo «Mayorista» no existe o está desactivado. Los activos: Prospecto, Cliente, Cliente VIP.',
      },
    ])
  })

  it('uno que se apagó ya no está entre los activos que ofrece la base', () => {
    const sinVip = { ...CONTEXTO, tipos: TIPOS.filter((t) => t.id !== TIPO_VIP) }
    const [fila] = preparar([celda('Cliente VIP')], { contexto: sinVip })
    expect(fila?.motivos[0]?.motivo).toBe(
      'El tipo «Cliente VIP» no existe o está desactivado. Los activos: Prospecto, Cliente.',
    )
  })

  it('con más de diez activos nombra diez y cuenta el resto', () => {
    expect(
      motivoDeTipoDesconocido('X', {
        ...CONTEXTO,
        tipos: Array.from({ length: 13 }, (_, n) => ({
          id: `id-${String(n)}`,
          clave: `t${String(n)}`,
          nombre: `T${String(n)}`,
          clase: 'cliente' as const,
        })),
      }),
    ).toBe(
      'El tipo «X» no existe o está desactivado. Los activos: T0, T1, T2, T3, T4, T5, T6, T7, T8, T9 y 3 más.',
    )
  })

  it('sin la celda, el de todo el archivo; y ese elegido vale sólo si la base lo ofrece', () => {
    const [bueno] = preparar([celda('')], { eleccion: { origenId: WEB, tipoLeadId: TIPO_VIP } })
    expect(bueno?.pedido?.lead.tipo_lead_id).toBe(TIPO_VIP)
    const [malo] = preparar([celda('')], { eleccion: { origenId: WEB, tipoLeadId: 'ya-no-esta' } })
    expect(malo?.pedido).toBeNull()
    expect(malo?.motivos[0]?.campo).toBe('tipo_lead_id')
  })

  it('sin ningún tipo activo no se puede importar y lo dice', () => {
    const [fila] = preparar([celda('Cliente')], {
      contexto: { ...CONTEXTO, tipos: [], tipoPorDefectoId: null },
      eleccion: { origenId: WEB, tipoLeadId: '' },
    })
    expect(fila?.motivos[0]?.motivo).toBe(
      'El tipo «Cliente» no existe o está desactivado. No hay tipos activos: no se puede importar.',
    )
  })
})
