import { describe, expect, it } from 'vitest'
import {
  clienteElegidoDesde,
  clientesDelPanelDesde,
  columnasDelPanel,
  idsDeTiposDeLaClase,
  instanteDelPanel,
  leerTextoDelPanel,
  ORDEN_DEL_PANEL,
  pedidoDeCandidatos,
  pestanaDelPanel,
  PESTANAS_DEL_PANEL,
} from './panel-para-cotizar'
import type { TipoDeLeadEnCatalogo } from './catalogos'

const ID = '11111111-2222-4333-8444-555555555555'
const OTRO = '11111111-2222-4333-8444-666666666666'

const tipo = (id: string, clase: 'prospecto' | 'cliente', activo = true): TipoDeLeadEnCatalogo => ({
  id,
  clave: id,
  nombre: id,
  clase,
  activo,
})

describe('pestanaDelPanel', () => {
  it('abre en «Todos»: una pestaña ausente o desconocida es la primera', () => {
    expect(PESTANAS_DEL_PANEL[0]).toBe('todos')
    expect(pestanaDelPanel(null)).toBe('todos')
    expect(pestanaDelPanel('')).toBe('todos')
    expect(pestanaDelPanel('otra')).toBe('todos')
    expect(pestanaDelPanel('prospecto')).toBe('prospecto')
    expect(pestanaDelPanel('cliente')).toBe('cliente')
  })
})

describe('idsDeTiposDeLaClase', () => {
  it('son los tipos de esa clase, también los apagados (un lead conserva el suyo)', () => {
    const tipos = [
      tipo('a', 'prospecto'),
      tipo('b', 'cliente'),
      tipo('c', 'cliente', false),
      tipo('d', 'prospecto', false),
    ]
    expect(idsDeTiposDeLaClase(tipos, 'cliente')).toEqual(['b', 'c'])
    expect(idsDeTiposDeLaClase(tipos, 'prospecto')).toEqual(['a', 'd'])
    expect(idsDeTiposDeLaClase([], 'cliente')).toEqual([])
  })
})

describe('el orden y las columnas de cada lista', () => {
  it('«míos» camina por lo más reciente y la búsqueda por alta, los dos hacia atrás en el tiempo', () => {
    expect(ORDEN_DEL_PANEL.todos).toEqual({ columna: 'reciente_en', ascendente: false })
    expect(ORDEN_DEL_PANEL.prospecto).toEqual(ORDEN_DEL_PANEL.todos)
    expect(ORDEN_DEL_PANEL.cliente).toEqual(ORDEN_DEL_PANEL.todos)
    expect(ORDEN_DEL_PANEL.busqueda).toEqual({ columna: 'creado_en', ascendente: false })
  })

  it('cada lista pide los tres números del lead y el instante por el que pagina', () => {
    const cartera = columnasDelPanel('todos').split(', ')
    expect(cartera).toEqual(
      expect.arrayContaining([
        'id',
        'nombre',
        'tipo_lead_id',
        'numero',
        'numero_propio',
        'numero_propio_creador',
        'reciente_en',
      ]),
    )
    expect(cartera).not.toContain('creado_en')
    const busqueda = columnasDelPanel('busqueda').split(', ')
    expect(busqueda).toContain('creado_en')
    expect(busqueda).not.toContain('reciente_en')
    expect(columnasDelPanel('cliente')).toBe(columnasDelPanel('todos'))
  })
})

describe('leerTextoDelPanel', () => {
  it('sin texto no busca ni avisa', () => {
    expect(leerTextoDelPanel('')).toEqual({ busqueda: null, aviso: null })
    expect(leerTextoDelPanel('   ')).toEqual({ busqueda: null, aviso: null })
  })

  it('con menos de 3 letras avisa y siguen las pestañas', () => {
    const corto = leerTextoDelPanel('an')
    expect(corto.busqueda).toBeNull()
    expect(corto.aviso).toBe('Escribe al menos 3 letras')
  })

  it('3 letras buscan el nombre; un número corto y «#n» buscan sólo el número', () => {
    expect(leerTextoDelPanel('Ana').busqueda).toEqual({
      texto: 'Ana',
      numero: null,
      soloNumero: false,
    })
    expect(leerTextoDelPanel('#124').busqueda).toEqual({
      texto: '124',
      numero: 124,
      soloNumero: true,
    })
    expect(leerTextoDelPanel('12').busqueda).toEqual({ texto: '12', numero: 12, soloNumero: true })
    expect(leerTextoDelPanel('124').busqueda).toEqual({
      texto: '124',
      numero: 124,
      soloNumero: false,
    })
  })
})

describe('pedidoDeCandidatos', () => {
  it('lleva el texto, el sentido y el cursor de alta; nunca «míos» (busca entre los leads que se ven)', () => {
    const pedido = pedidoDeCandidatos({ texto: 'Ana', numero: null, soloNumero: false }, [], {
      instante: '2026-10-01T10:00:00Z',
      id: ID,
      sentido: 'anterior',
    })
    expect(pedido).toEqual({
      texto: 'Ana',
      sentido: 'anterior',
      cursor: { creado_en: '2026-10-01T10:00:00Z', id: ID },
    })
    expect(pedido).not.toHaveProperty('mios')
  })

  it('suma los ids del número como «extra» y sin cursor va hacia adelante', () => {
    expect(
      pedidoDeCandidatos({ texto: '124', numero: 124, soloNumero: false }, [ID, OTRO], null),
    ).toEqual({ texto: '124', sentido: 'siguiente', extra: [ID, OTRO] })
  })

  it('sólo número: no hay candidatos que pedir', () => {
    expect(
      pedidoDeCandidatos({ texto: '124', numero: 124, soloNumero: true }, [ID], null),
    ).toBeNull()
  })
})

const fila = (extra: Record<string, unknown> = {}) => ({
  id: ID,
  nombre: 'Ana',
  tipo_lead_id: OTRO,
  numero: 7,
  numero_propio: 3,
  numero_propio_creador: null,
  reciente_en: '2026-10-30T12:00:00.123456+00:00',
  ...extra,
})

describe('clientesDelPanelDesde', () => {
  it('arma la fila con sus números y el instante de «míos»', () => {
    const [cliente] = clientesDelPanelDesde([fila()], 'todos') ?? []
    expect(cliente).toMatchObject({
      id: ID,
      nombre: 'Ana',
      tipoId: OTRO,
      numeros: { numero: 7, numeroPropio: 3, creadorDelPropio: null },
      recienteEn: '2026-10-30T12:00:00.123456+00:00',
    })
    expect(instanteDelPanel('todos', cliente!)).toBe('2026-10-30T12:00:00.123456+00:00')
    expect(instanteDelPanel('cliente', cliente!)).toBe('2026-10-30T12:00:00.123456+00:00')
  })

  it('la búsqueda pagina por alta', () => {
    const crudo = fila({ reciente_en: undefined, creado_en: '2026-09-01T00:00:00+00:00' })
    const [cliente] = clientesDelPanelDesde([crudo], 'busqueda') ?? []
    expect(instanteDelPanel('busqueda', cliente!)).toBe('2026-09-01T00:00:00+00:00')
  })

  it('una fila sin el instante de su lista hace de la lectura un error (null), no una fila', () => {
    expect(clientesDelPanelDesde([fila({ reciente_en: null })], 'todos')).toBeNull()
    expect(clientesDelPanelDesde([fila({ creado_en: null })], 'busqueda')).toBeNull()
  })

  it('una fila rota (sin id válido o sin nombre) hace de la lectura un error, no un throw', () => {
    expect(clientesDelPanelDesde([fila({ id: 'x' })], 'todos')).toBeNull()
    expect(clientesDelPanelDesde([fila({ nombre: null })], 'todos')).toBeNull()
    expect(clientesDelPanelDesde('no es una lista', 'todos')).toBeNull()
  })

  it('un lead sin tipo queda sin tipo', () => {
    const [cliente] = clientesDelPanelDesde([fila({ tipo_lead_id: null })], 'todos') ?? []
    expect(cliente?.tipoId).toBeNull()
  })
})

describe('clienteElegidoDesde', () => {
  it('es el nombre, el tipo y los números del lead de la URL', () => {
    expect(clienteElegidoDesde(fila())).toEqual({
      id: ID,
      nombre: 'Ana',
      tipoId: OTRO,
      numeros: { numero: 7, numeroPropio: 3, creadorDelPropio: null },
    })
  })

  it('una fila rota es null', () => {
    expect(clienteElegidoDesde({ id: ID })).toBeNull()
  })
})
