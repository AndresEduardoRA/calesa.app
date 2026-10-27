import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Arnes, pasoCompuerta, pasoListo, responder } from './bucle.arnes'

// Los topes de gasto. `--max-budget-usd` vale por invocación y una retoma empieza de cero (CLI reference), así que el bucle lleva
// el gasto del paso ENTERO (plan, retomas tras una compuerta, reintentos): pasa a cada llamada lo que queda de PILOTO_TOPE_USD_PASO.
// `total_cost_usd` es acumulado de la sesión. Un tope agotado (`subtype: error_max_budget_usd`) no es un fallo del proceso: no se
// reintenta, se pregunta. En el 4.13-3b, una llamada costó 17,76 y la otra 25,80 (43,55 el paso); el peor caso con topes por llamada
// y un reintento cada una era 200 USD.
vi.setConfig({ testTimeout: 60_000 })

let a: Arnes
beforeEach(() => {
  a = new Arnes()
})
afterEach(() => a.limpiar())

const salida = (usd: number, extra: Record<string, unknown> = {}) => ({
  type: 'result',
  subtype: 'success',
  is_error: false,
  result: 'hecho',
  session_id: 'fake',
  total_cost_usd: usd,
  duration_ms: 1000,
  modelUsage: { 'claude-opus-5-5': { inputTokens: 1, outputTokens: 1, costUSD: usd } },
  ...extra,
})
const agotado = (usd: number) =>
  salida(usd, { subtype: 'error_max_budget_usd', is_error: true, result: undefined })

describe('bucle.sh › los topes de gasto', () => {
  it('el ruteo lleva 0,5 USD y el paso, el tope del paso entero (60)', () => {
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    const r = a.correr(['--hasta', '4.99'])
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('ruteo')[0]).toContain('--max-budget-usd 0.5 ')
    expect(a.llamadas('paso')[0]).toContain('--max-budget-usd 60.00 ')
  })

  it('tras una compuerta, la retoma lleva lo que le queda al paso, y la compuerta dice cuánto lleva', () => {
    a.paso(1, pasoCompuerta('dependencia'), { salida: salida(17.76) })
    a.decidir(1, responder('aprobar'))
    a.paso(2, pasoListo({ 'src/a.ts': 'a' }), { salida: salida(43.55) })
    const r = a.correr(['--hasta', '4.99'])
    expect(r.estado, r.salida).toBe(0)
    expect(a.leerFake('compuerta-1.md')).toContain('lleva 17.76 de 60.00 USD')
    expect(a.llamadas('paso')[1]).toContain('--resume')
    expect(a.llamadas('paso')[1]).toContain('--max-budget-usd 42.24 ')
  })

  it('un tope agotado no es un fallo del proceso: no se reintenta, se anota «tope» y se pregunta', () => {
    a.paso(1, 'true', { salida: agotado(60.4), salida_codigo: 1 })
    a.decidir(1, responder('parado'))
    const r = a.correr()
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('paso')).toHaveLength(1)
    expect(a.estado('consumo.csv')).toMatch(/,paso,4\.99,.*,tope(,|$)/m)
    expect(a.estado('fallas').trim() || '0').toBe('0')
    const compuerta = a.leerFake('compuerta-1.md')
    expect(compuerta).toContain('tipo: parada')
    expect(compuerta).toContain('el paso 4.99 gastó 60.40 de 60.00 USD')
    expect(compuerta).toMatch(/^- sigo — 30\.00 USD más, una sola vez/m)
  })

  it('«sigo» da 50 % más una sola vez: la retoma lleva lo que queda y el segundo tope ya no ofrece seguir', () => {
    a.paso(1, 'true', { salida: agotado(60.4), salida_codigo: 1 })
    a.decidir(1, responder('sigo'))
    a.paso(2, 'true', { salida: agotado(90.2), salida_codigo: 1 })
    a.decidir(2, responder('parado'))
    const r = a.correr()
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('paso')).toHaveLength(2)
    expect(a.llamadas('paso')[1]).toContain('--resume')
    expect(a.llamadas('paso')[1]).toContain('--max-budget-usd 29.60 ')
    const segunda = a.leerFake('compuerta-2.md')
    expect(segunda).toContain('gastó 90.20 de 90.00 USD')
    expect(segunda).not.toMatch(/^- sigo/m)
    expect(segunda).toMatch(/^- reintentar/m)
  })

  it('un «sigo» escrito a mano en el segundo tope no da otro 50 %: el paso no se vuelve a lanzar', () => {
    a.paso(1, 'true', { salida: agotado(60.4), salida_codigo: 1 })
    a.decidir(1, responder('sigo'))
    a.paso(2, 'true', { salida: agotado(90.2), salida_codigo: 1 })
    a.decidir(2, responder('sigo'))
    a.decidir(3, responder('parado'))
    const r = a.correr()
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('paso')).toHaveLength(2)
    expect(a.estado('registro.md').match(/sigue con 30\.00 USD más/g)).toHaveLength(1)
    expect(a.leerFake('compuerta-3.md')).toContain('gastó 90.20 de 90.00 USD')
  })

  it('si al paso le quedan menos de 5 USD, no se lanza: se pregunta antes de gastar', () => {
    a.paso(1, pasoCompuerta('dependencia'), { salida: salida(56) })
    a.decidir(1, responder('aprobar'))
    a.decidir(2, responder('parado'))
    const r = a.correr()
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('paso')).toHaveLength(1)
    expect(a.leerFake('compuerta-2.md')).toContain('el paso 4.99 gastó 56.00 de 60.00 USD')
  })

  it('PILOTO_TOPE_USD_PASO cambia el tope del paso', () => {
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    a.correr(['--hasta', '4.99'], { PILOTO_TOPE_USD_PASO: '45' })
    expect(a.llamadas('paso')[0]).toContain('--max-budget-usd 45.00 ')
  })
})
