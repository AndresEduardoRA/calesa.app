import { describe, expect, it } from 'vitest'
import {
  CODIGOS_DE_COMPILACION,
  compilarExpresion,
  MAXIMO_DE_TEXTO,
  type CodigoDeCompilacion,
  type ContextoDeCompilacion,
  type DestinoDeCompilacion,
  type ErrorDeCompilacion,
  type ResultadoDeCompilacion,
  type Tramo,
} from './index'

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

  it('exporta la lista de códigos y el tope del texto de una fila', () => {
    expect(CODIGOS_DE_COMPILACION).toContain('hoy_no_soportado')
    expect(CODIGOS_DE_COMPILACION.length).toBeGreaterThanOrEqual(28)
    expect(MAXIMO_DE_TEXTO).toBe(2000)
  })
})
