import { describe, expect, it, vi } from 'vitest'
import {
  ANCHOS,
  CODIGOS_DE_COMPILACION,
  compilarExpresion,
  EFECTOS_DE_INTERRUPTOR,
  MAXIMO_DE_ATAJOS,
  MAXIMO_DE_TEXTO,
  NIVEL_TODOS,
  PRESENTACIONES,
  REGLAS_DE_DISENO,
  SECUNDARIOS,
  validarDiseno,
  type CeldaDeDiseno,
  type CodigoDeCompilacion,
  type ContextoDeCompilacion,
  type ContextoDeDiseno,
  type DestinoDeCompilacion,
  type Diseno,
  type ErrorDeCompilacion,
  type ItemDeDiseno,
  type ModoDeTipoDeCambio,
  type RechazoDeDiseno,
  type ReglaDeDiseno,
  type ResultadoDeCompilacion,
  type ResultadoDeValidacionDeDiseno,
  type SeccionDeDiseno,
  type Tramo,
} from './index'

// `index.ts` también lleva la lectura de los niveles (servidor): su composición pide `server-only` y el cliente de Supabase, que acá no corren.
vi.mock('server-only', () => ({}))
vi.mock('@/shared/lib/supabase/server', () => ({ createClient: vi.fn() }))

// La entrada pública del módulo lleva lo que el editor de fórmulas (4.21) va a usar.
const destino: DestinoDeCompilacion = { id: 'total', etiqueta: 'Total', salida: 'total' }
const contexto: ContextoDeCompilacion = {
  nodos: [{ id: 'remate', tipo: 'input', etiqueta: 'Remate' }],
  grupos: [],
  params: {},
  destino,
}

describe('index.ts del módulo cotizaciones', () => {
  it('compila un texto a nodos por la entrada pública', () => {
    const r: ResultadoDeCompilacion = compilarExpresion('=remate*4%', contexto)
    expect(r.ok ? r.nodos.map((n) => n.id) : r.error.codigo).toEqual(['total__1', 'total'])
  })

  it('un texto que no compila devuelve un error con un código de la lista, no una excepción', () => {
    const r = compilarExpresion('=remate*', contexto)
    const error: ErrorDeCompilacion | undefined = r.ok ? undefined : r.error
    const codigo: CodigoDeCompilacion | undefined = error?.codigo
    const tramo: Tramo | undefined = error?.tramo
    expect(codigo).toBeDefined()
    expect(CODIGOS_DE_COMPILACION).toContain(codigo)
    expect(tramo).toMatchObject({ desde: 7, largo: 1, linea: 1, columna: 8 })
  })

  it('lleva la lectura de los niveles de acceso (4.09), y los tipos de su lista', async () => {
    const modulo = await import('./index')
    expect(typeof modulo.leerNivelesDeAcceso).toBe('function')
  })

  it('lleva la lectura de la hoja de cotizar (4.13)', async () => {
    const modulo = await import('./index')
    expect(typeof modulo.leerHojaParaCotizar).toBe('function')
  })

  it('exporta la lista de códigos y el tope del texto de una fila', () => {
    expect(CODIGOS_DE_COMPILACION).toContain('hoy_no_soportado')
    expect(CODIGOS_DE_COMPILACION.length).toBeGreaterThanOrEqual(28)
    expect(MAXIMO_DE_TEXTO).toBe(2000)
  })
})

// Lo que el editor del diseño (4.22) va a usar.
describe('index.ts del módulo cotizaciones: el diseño de la hoja', () => {
  const definicion = {
    nodos: [{ id: 'monto', tipo: 'input' as const, etiqueta: 'Monto', salida: 'total' as const }],
  }
  const contexto: ContextoDeDiseno = { niveles: [], retirados: [], tonos: [] }
  const celda: CeldaDeDiseno = { tipo: 'celda', nodo: 'monto', ancho: 'completo' }
  const item: ItemDeDiseno = celda
  const seccion: SeccionDeDiseno = { id: 's', presentacion: 'principal', items: [item] }
  const modos: ModoDeTipoDeCambio[] = []
  const diseno: Diseno = {
    cabecera: { modos, ver_total_bs: false },
    secciones: [seccion],
    tarjeta_total: { nodo: 'monto', secundarios: [] },
  }

  it('valida un diseño por la entrada pública', () => {
    const r: ResultadoDeValidacionDeDiseno = validarDiseno(definicion, diseno, contexto)
    expect(r.ok).toBe(true)
  })

  it('un diseño que no pasa devuelve su regla y su donde, no una excepción', () => {
    const roto: Diseno = { ...diseno, tarjeta_total: { nodo: 'otro', secundarios: [] } }
    const r = validarDiseno(definicion, roto, contexto)
    const error: RechazoDeDiseno | undefined = r.ok ? undefined : r.error
    const regla: ReglaDeDiseno | undefined = error?.regla
    expect(regla).toBe('nodo_inexistente')
    expect(error?.donde).toBe('otro')
    expect(REGLAS_DE_DISENO).toContain(regla)
  })

  it('exporta las listas cerradas que el diseño admite', () => {
    expect(ANCHOS).toEqual(['completo', 'mitad', 'tercio'])
    expect(PRESENTACIONES).toEqual(['principal', 'avanzado'])
    expect(SECUNDARIOS).toEqual(['porcentaje', 'monto'])
    expect(EFECTOS_DE_INTERRUPTOR).toEqual(['habilita', 'muestra'])
    expect(MAXIMO_DE_ATAJOS).toBe(12)
    expect(NIVEL_TODOS).toBe('todos')
    expect(REGLAS_DE_DISENO).toHaveLength(29)
  })
})
