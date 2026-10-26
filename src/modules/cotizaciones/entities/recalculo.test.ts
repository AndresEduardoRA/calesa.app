import { describe, expect, it } from 'vitest'
import { CODIGOS_DE_FALTANTE, ESTADOS, FUENTES, MOTIVOS_DE_DESCARTE } from './motor-contexto'
import { pideRecargar, recalculoDesde } from './recalculo'
import {
  DESCARTES_DE_RECALCULO,
  ESTADOS_DE_RECALCULO,
  FALTANTES_DE_RECALCULO,
  FUENTES_DE_RECALCULO,
} from './recalculo-esquema'

const cruda = () => ({
  valores: { remate: 1000, variante: 'gasolina', fees: null, constructor: 5 },
  estados: { remate: 'activo', fees: 'condicion_apagada' },
  fuentes: { remate: 'input', fees: 'sugerido' },
  totales: { usd: 1234.5, bs: 15000, suma_usd: 1200 },
  faltantes: [{ codigo: 'requerido_sin_valor', donde: 'remate', ref: 'cuenta' }],
  overrides_descartados: [{ id: 'x', motivo: 'nodo_inexistente' }],
  hay_faltantes_ocultos: true,
})

describe('recalculoDesde: lo que devuelve cotizacion_evaluar a quien cotiza', () => {
  it('lee la respuesta entera con Map, y un id como «constructor» no se confunde con el prototipo', () => {
    const r = recalculoDesde(cruda())
    expect(r?.valores.get('remate')).toBe(1000)
    expect(r?.valores.get('variante')).toBe('gasolina')
    expect(r?.valores.get('fees')).toBeNull()
    expect(r?.valores.get('constructor')).toBe(5)
    expect(r?.valores.has('toString')).toBe(false)
    expect(r?.estados.get('fees')).toBe('condicion_apagada')
    expect(r?.fuentes.get('remate')).toBe('input')
    expect(r?.totales).toEqual({ usd: 1234.5, bs: 15000, sumaUsd: 1200 })
    expect(r?.faltantes).toEqual([
      { codigo: 'requerido_sin_valor', donde: 'remate', ref: 'cuenta' },
    ])
    expect(r?.descartados).toEqual([{ id: 'x', motivo: 'nodo_inexistente' }])
    expect(r?.hayFaltantesOcultos).toBe(true)
  })

  it('lo que la base no manda (descartados, faltantes ocultos) queda vacío y un total sin valor es null', () => {
    const { overrides_descartados: _a, hay_faltantes_ocultos: _b, ...resto } = cruda()
    const r = recalculoDesde({ ...resto, totales: { usd: null, bs: null, suma_usd: null } })
    expect(r?.descartados).toEqual([])
    expect(r?.hayFaltantesOcultos).toBe(false)
    expect(r?.totales.usd).toBeNull()
  })

  it('lo que no es lo que la base promete es nulo, no una hoja a medias', () => {
    expect(recalculoDesde(null)).toBeNull()
    expect(recalculoDesde({})).toBeNull()
    expect(recalculoDesde({ ...cruda(), estados: { remate: 'raro' } })).toBeNull()
    expect(recalculoDesde({ ...cruda(), faltantes: [{ codigo: 'otro', donde: 'x' }] })).toBeNull()
  })

  it('las listas cerradas que viajan al navegador son las del motor', () => {
    expect(ESTADOS_DE_RECALCULO).toEqual(ESTADOS)
    expect(FUENTES_DE_RECALCULO).toEqual(FUENTES)
    expect(FALTANTES_DE_RECALCULO).toEqual(CODIGOS_DE_FALTANTE)
    expect(DESCARTES_DE_RECALCULO).toEqual(MOTIVOS_DE_DESCARTE)
  })
})

describe('pideRecargar: qué error no se arregla volviendo a pedir', () => {
  it('una regla rota (la fórmula cambió), un permiso que se fue o una sesión vencida piden recargar; lo demás, reintentar', () => {
    expect(pideRecargar({ codigo: 'regla' })).toBe(true)
    expect(pideRecargar({ codigo: 'sin_permiso' })).toBe(true)
    expect(pideRecargar({ codigo: 'no_autenticado' })).toBe(true)
    expect(pideRecargar({ codigo: 'inesperado' })).toBe(false)
    expect(pideRecargar({ codigo: 'conflicto' })).toBe(false)
  })
})
