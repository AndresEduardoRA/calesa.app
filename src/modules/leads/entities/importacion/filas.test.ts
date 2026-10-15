import { describe, expect, it } from 'vitest'
import type { ContextoDeAlta } from '../alta'
import { camposDeLeadDesde, type CampoDeLead } from '../campo'
import { prepararFilas, type EntradaDePreparacion, type FilaPreparada } from './filas'

const WEB = '11111111-1111-4111-8111-111111111111'
const REFERIDO = '22222222-2222-4222-8222-222222222222'

const CONTEXTO: ContextoDeAlta = {
  telefonoCc: '+591',
  origenes: [
    { id: WEB, clave: 'web', nombre: 'Web' },
    { id: REFERIDO, clave: 'referido', nombre: 'Referido' },
  ],
  tiposDeSeguimiento: [],
  ultimoOrigenId: null,
  empresa: { ciudad: null, pais: null },
}

const BASE = {
  opciones: [],
  requerido: false,
  valor_defecto: null,
  valor_defecto_empresa: null,
  grupo: null,
  en_tabla: false,
  filtrable: false,
  solo_cartera: false,
  es_sistema: false,
  activo: true,
  actualizado_en: '2026-10-14T20:00:00+00:00',
}

const CAMPOS: CampoDeLead[] = camposDeLeadDesde([
  {
    ...BASE,
    id: '00000000-0000-0000-0000-000000000001',
    clave: 'ciudad',
    etiqueta: 'Ciudad',
    tipo: 'texto',
    orden: 10,
  },
  {
    ...BASE,
    id: '00000000-0000-0000-0000-000000000002',
    clave: 'edad',
    etiqueta: 'Edad',
    tipo: 'numero',
    orden: 20,
  },
  {
    ...BASE,
    id: '00000000-0000-0000-0000-000000000003',
    clave: 'vehiculo',
    etiqueta: 'Vehículo',
    tipo: 'opcion',
    orden: 30,
    opciones: [
      { clave: 'sedan', etiqueta: 'Sedán' },
      { clave: 'suv', etiqueta: 'SUV' },
    ],
  },
  {
    ...BASE,
    id: '00000000-0000-0000-0000-000000000004',
    clave: 'cedula',
    etiqueta: 'Cédula',
    tipo: 'documento',
    orden: 40,
    solo_cartera: true,
    requerido: true,
  },
  {
    ...BASE,
    id: '00000000-0000-0000-0000-000000000005',
    clave: 'apagado',
    etiqueta: 'Apagado',
    tipo: 'texto',
    orden: 50,
    activo: false,
  },
])

const DESTINOS = [
  'nombre',
  'telefono_principal',
  'tipo',
  'origen_lead_id',
  'atributos.ciudad',
  'atributos.edad',
  'atributos.vehiculo',
  'atributos.cedula',
]

let contador = 0
function preparar(filas: string[][], extra: Partial<EntradaDePreparacion> = {}): FilaPreparada[] {
  contador = 0
  return prepararFilas({
    filas,
    destinos: DESTINOS,
    campos: CAMPOS,
    contexto: CONTEXTO,
    zona: 'America/La_Paz',
    ahora: '2026-10-15T15:00:00Z',
    eleccion: { origenId: WEB, tipo: 'prospecto' },
    nuevoId: () => `id-${String((contador += 1))}`,
    ...extra,
  })
}

const BUENA = ['Ana Pérez', '70011002', 'Cliente', 'Referido', 'La Paz', '35', 'Sedán', 'CI-1234']

describe('prepararFilas: una fila buena', () => {
  it('entra con su pedido, el id del intento y las claves de la base', () => {
    const [fila] = preparar([BUENA])
    expect(fila).toMatchObject({ id: 'id-1', fila: 2, nombre: 'Ana Pérez', motivos: [] })
    expect(fila?.pedido).toEqual({
      id: 'id-1',
      fila: 2,
      lead: {
        nombre: 'Ana Pérez',
        telefono_principal: '70011002',
        tipo: 'cliente',
        origen_lead_id: REFERIDO,
        atributos: { ciudad: 'La Paz', edad: 35, vehiculo: 'sedan', cedula: 'CI-1234' },
      },
    })
  })

  it('la primera fila de datos es la 2: la 1 son los encabezados', () => {
    const filas = preparar([BUENA, [...BUENA.slice(0, 1), '70011003', ...BUENA.slice(2)]])
    expect(filas.map((f) => f.fila)).toEqual([2, 3])
  })

  it('el teléfono admite «+», espacios y guiones', () => {
    const [fila] = preparar([['Ana', '+591 7001-1002', '', '', '', '', '', 'CI-1']])
    expect(fila?.pedido?.lead.telefono_principal).toBe('+591 7001-1002')
    expect(fila?.motivos).toEqual([])
  })
})

describe('prepararFilas: el origen y el tipo', () => {
  it('sin celda usa el de todo el archivo', () => {
    const [fila] = preparar([['Ana', '70011002', '', '', '', '', '', 'CI-1']], {
      eleccion: { origenId: REFERIDO, tipo: 'cliente' },
    })
    expect(fila?.pedido?.lead).toMatchObject({ origen_lead_id: REFERIDO, tipo: 'cliente' })
  })

  it('un origen que no existe es un error de esa fila y no se crea uno', () => {
    const [fila] = preparar([['Ana', '70011002', '', 'Radio', '', '', '', 'CI-1']])
    expect(fila?.pedido).toBeNull()
    expect(fila?.motivos).toEqual([
      { campo: 'origen_lead_id', motivo: 'El origen «Radio» no existe o está apagado.' },
    ])
  })

  it('un origen apagado no se ofrece: no está entre los activos', () => {
    const sinReferido = { ...CONTEXTO, origenes: CONTEXTO.origenes.filter((o) => o.id === WEB) }
    const [fila] = preparar([['Ana', '70011002', '', 'Referido', '', '', '', 'CI-1']], {
      contexto: sinReferido,
    })
    expect(fila?.motivos[0]?.campo).toBe('origen_lead_id')
  })

  it('un tipo inválido es un error', () => {
    const [fila] = preparar([['Ana', '70011002', 'VIP', '', '', '', '', 'CI-1']])
    expect(fila?.motivos[0]?.campo).toBe('tipo')
    expect(fila?.pedido).toBeNull()
  })

  it('sin origen elegido y con orígenes activos, la fila pide uno', () => {
    const [fila] = preparar([['Ana', '70011002', '', '', '', '', '', 'CI-1']], {
      eleccion: { origenId: null, tipo: 'prospecto' },
    })
    expect(fila?.motivos[0]).toMatchObject({ campo: 'origen_lead_id' })
  })
})

describe('prepararFilas: lo que no pasa', () => {
  it.each([
    ['nombre vacío', ['', '70011002', '', '', '', '', '', 'CI-1'], 'nombre'],
    ['teléfono vacío', ['Ana', '', '', '', '', '', '', 'CI-1'], 'telefono_principal'],
    ['teléfono con letras', ['Ana', '7001abcd', '', '', '', '', '', 'CI-1'], 'telefono_principal'],
    [
      'teléfono internacional de 7 dígitos',
      ['Ana', '+7001100', '', '', '', '', '', 'CI-1'],
      'telefono_principal',
    ],
    [
      'teléfono internacional de 16 dígitos',
      ['Ana', '+5917001100200000', '', '', '', '', '', 'CI-1'],
      'telefono_principal',
    ],
    ['requerido faltante', ['Ana', '70011002', '', '', '', '', '', ''], 'atributos.cedula'],
    [
      'opción inexistente',
      ['Ana', '70011002', '', '', '', '', 'Moto', 'CI-1'],
      'atributos.vehiculo',
    ],
    ['número mal formado', ['Ana', '70011002', '', '', '', 'abc', '', 'CI-1'], 'atributos.edad'],
  ])('%s', (_caso, celdas, campo) => {
    const [fila] = preparar([celdas])
    expect(fila?.pedido).toBeNull()
    expect(fila?.motivos.map((m) => m.campo)).toContain(campo)
  })

  it('un teléfono en notación científica dice cómo arreglarlo', () => {
    const [fila] = preparar([['Ana', '5.917E+10', '', '', '', '', '', 'CI-1']])
    expect(fila?.pedido).toBeNull()
    const motivo = fila?.motivos.find((m) => m.campo === 'telefono_principal')?.motivo ?? ''
    expect(motivo).toContain('notación científica')
    expect(motivo).toContain('texto')
  })

  it('todos los motivos de la fila, no sólo el primero', () => {
    const [fila] = preparar([['', '', 'VIP', 'Radio', '', 'abc', 'Moto', '']])
    expect(fila?.motivos.length).toBeGreaterThanOrEqual(5)
  })

  it('una fila mala no tumba a las demás', () => {
    const filas = preparar([
      BUENA,
      ['', '70011009', '', '', '', '', '', 'CI-1'],
      BUENA.map((c, i) => (i === 1 ? '70011010' : c)),
    ])
    expect(filas.map((f) => f.pedido !== null)).toEqual([true, false, true])
  })
})

describe('prepararFilas: un teléfono repetido en el archivo', () => {
  it('se marca desde la segunda aparición, y dice dónde está la primera', () => {
    const otra = BUENA.map((c, i) => (i === 0 ? 'Luis' : c))
    const escrito = BUENA.map((c, i) => (i === 1 ? '+591 70011002' : c))
    const filas = preparar([BUENA, otra, escrito])
    expect(filas.map((f) => f.pedido !== null)).toEqual([true, false, false])
    expect(filas[1]?.motivos[0]?.motivo).toContain('fila 2')
    expect(filas[2]?.motivos[0]?.motivo).toContain('fila 2')
  })
})

describe('prepararFilas: campos fuera del layout y celdas peligrosas', () => {
  it('un campo apagado no se ofrece: su columna, si llega, se ignora', () => {
    const [fila] = preparar([[...BUENA, 'dato']], { destinos: [...DESTINOS, 'atributos.apagado'] })
    expect(fila?.pedido?.lead.atributos).not.toHaveProperty('apagado')
  })

  it('las fórmulas quedan como texto, y un destino que no es del layout no escribe nada', () => {
    const [fila] = preparar(
      [["=cmd|' /C calc'!A0", '70011002', '', '', '=1+1', '', '', 'CI-1', 'x']],
      { destinos: [...DESTINOS, '__proto__'] },
    )
    expect(fila?.pedido?.lead.nombre).toBe("=cmd|' /C calc'!A0")
    expect(fila?.pedido?.lead.atributos['ciudad']).toBe('=1+1')
    expect(Object.keys(fila?.pedido?.lead.atributos ?? {}).sort()).toEqual(['cedula', 'ciudad'])
  })

  it('el apóstrofo de la exportación no es parte del teléfono ni del nombre', () => {
    const [fila] = preparar([["'+5491122334455", '+5491122334455', '', '', '', '', '', 'CI-1']])
    expect(fila?.nombre).toBe('+5491122334455')
  })
})
