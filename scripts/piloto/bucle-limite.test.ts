import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Arnes, pasoListo } from './bucle.arnes'

// De corrido (2026-11-09): ni el límite de uso ni un corte de red son fallas del paso. El carril duerme lo que haga falta y retoma; lo
// básico del límite (una siesta, el 429, sin hora legible, el ruteo) sigue en bucle-decision.test.ts.
vi.setConfig({ testTimeout: 60_000 })

let a: Arnes
beforeEach(() => {
  a = new Arnes()
})
afterEach(() => a.limpiar())

const LIMITE = {
  type: 'result',
  is_error: true,
  result: "You've hit your session limit · resets 3:45pm",
  session_id: 'fake',
}

describe('bucle.sh › el límite de uso, las veces que venga', () => {
  // De corrido (2026-11-09): el límite semanal puede volver varias veces seguidas. Dormir no es un aviso ni una falla: se duerme cada
  // vez y se retoma, y la hora queda anotada en la carpeta común para que los otros carriles no gasten una llamada en enterarse.
  it('si el límite vuelve tras dormir, duerme otra vez y retoma: no es un aviso', () => {
    a.paso(1, 'true', { salida: LIMITE, salida_codigo: 1 })
    a.paso(2, 'true', { salida: LIMITE, salida_codigo: 1 })
    a.paso(3, pasoListo({ 'src/a.ts': 'a' }))
    const r = a.correr(['--hasta', '4.99'])
    expect(r.estado, r.salida).toBe(0)
    expect(a.lineas('dormir.log')).toHaveLength(2)
    expect(a.llamadas('paso')).toHaveLength(3)
    expect(a.secuencia()).not.toContain('decidir:abrir parada 4.99')
    expect(a.estado('fallas').trim()).toBe('0')
    expect(Number(readFileSync(join(a.comun, 'limite-hasta'), 'utf8'))).toBeGreaterThan(
      Date.now() / 1000,
    )
  })

  it('el límite que anotó otro carril se duerme antes de gastar una llamada', () => {
    writeFileSync(join(a.comun, 'limite-hasta'), String(Math.floor(Date.now() / 1000) + 900))
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    const r = a.correr(['--hasta', '4.99'])
    expect(r.estado, r.salida).toBe(0)
    const [segundos] = a.lineas('dormir.log')
    expect(Number(segundos)).toBeGreaterThan(800)
    expect(Number(segundos)).toBeLessThanOrEqual(900)
    expect(a.estado('registro.md')).toContain('lo anotó otro carril')
  })

  it('el límite semanal con día («resets Nov 12, 3pm») duerme hasta ese día, nunca más de 7', () => {
    const en3dias = new Date(Date.now() + 3 * 86_400_000)
    const mes = en3dias.toLocaleString('en-US', { month: 'short', timeZone: 'America/La_Paz' })
    const dia = en3dias.toLocaleString('en-US', { day: 'numeric', timeZone: 'America/La_Paz' })
    const semanal = {
      ...LIMITE,
      result: `You've hit your weekly limit · resets ${mes} ${dia}, 3pm (America/La_Paz)`,
    }
    a.paso(1, 'true', { salida: semanal, salida_codigo: 1 })
    a.paso(2, pasoListo({ 'src/a.ts': 'a' }))
    expect(a.correr(['--hasta', '4.99']).estado).toBe(0)
    const [segundos] = a.lineas('dormir.log')
    expect(Number(segundos)).toBeGreaterThan(2 * 86_400)
    expect(Number(segundos)).toBeLessThanOrEqual(4 * 86_400)
  })
})

describe('bucle.sh › sin red', () => {
  // 2026-11-08, carril C: dos «Can't reach the API server (EAI_AGAIN)» en tres minutos contaron como «el paso falló dos veces».
  it('sin red no es una falla del paso: espera, retoma y no avisa', () => {
    const sinRed = {
      type: 'result',
      is_error: true,
      result: "API Error: Can't reach the API server (EAI_AGAIN)",
      session_id: 'fake',
    }
    a.paso(1, 'true', { salida: sinRed, salida_codigo: 1 })
    a.paso(2, 'true', { salida: sinRed, salida_codigo: 1 })
    a.paso(3, 'true', { salida: sinRed, salida_codigo: 1 })
    a.paso(4, pasoListo({ 'src/a.ts': 'a' }))
    const r = a.correr(['--hasta', '4.99'])
    expect(r.estado, r.salida).toBe(0)
    expect(a.lineas('dormir.log')).toEqual(['300', '600', '1200'])
    expect(a.llamadas('paso')).toHaveLength(4)
    expect(a.estado('consumo.csv')).toContain(',sin-red')
    expect(a.estado('fallas').trim()).toBe('0')
    expect(a.secuencia().filter((l) => l.startsWith('decidir:'))).toEqual([])
  })
})
