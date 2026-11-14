import { describe, expect, it } from 'vitest'
import type { FaseParaConfigurar } from '../flujo'
import { valoresDeFase } from './formulario-de-fase'
import {
  MENSAJES_DE_FASE,
  MOTIVO_NO_EXISTE_EN_REPUESTOS,
  avisoDeOtraInicial,
  esCampoDeFase,
  MOTIVO_SOLO_EN_SUBASTA,
  motivoDeEsSubasta,
  motivoDelInterruptor,
  nombreRepetido,
  otraFaseInicial,
  validarFase,
  type ContextoDeFase,
  type ValoresDeFase,
} from './reglas-de-fase'

const TODAS = ['vitrina_web', 'portal_cliente', 'aduana', 'logistica'].map((regla) => ({
  regla,
  activa: true,
}))
const VEHICULOS: ContextoDeFase = { ambito: 'vehiculos', reglas: TODAS, origenEsSubasta: false }
const SUBASTA: ContextoDeFase = { ...VEHICULOS, origenEsSubasta: true }
const REPUESTOS: ContextoDeFase = {
  ambito: 'repuestos',
  reglas: [{ regla: 'logistica', activa: true }],
  origenEsSubasta: false,
}
const SIN_REGLAS: ContextoDeFase = { ambito: 'vehiculos', reglas: [], origenEsSubasta: false }

const FASE: FaseParaConfigurar = {
  id: '11111111-1111-4111-8111-111111111111',
  nombre: 'En puerto',
  descripcion: null,
  color: '#465fff',
  icono: null,
  orden: 10,
  activa: true,
  esInicial: false,
  esFinal: false,
  esLogistica: false,
  demoraDias: null,
  alertaCadaHoras: null,
  notaObligatoria: false,
  permiteContenedor: true,
  permiteAduana: false,
  cuentaLlegadaRepuestos: false,
  publicaWeb: false,
  visiblePortal: false,
  aliasPortal: null,
  descripcionPortal: null,
  esSubasta: false,
}
const BASE: ValoresDeFase = valoresDeFase(FASE)
const con = (cambios: Partial<ValoresDeFase>): ValoresDeFase => ({ ...BASE, ...cambios })

function errores(valores: ValoresDeFase, contexto = VEHICULOS) {
  const r = validarFase(valores, contexto)
  return r.ok ? null : r.errores
}

describe('validarFase', () => {
  it('acepta una fase sana y deja los textos recortados y los opcionales vacíos, nulos', () => {
    const r = validarFase(
      con({ nombre: '  En puerto  ', descripcion: '  ', demoraDias: ' 3 ' }),
      VEHICULOS,
    )
    expect(r).toMatchObject({
      ok: true,
      datos: {
        nombre: 'En puerto',
        descripcion: null,
        demoraDias: 3,
        alertaCadaHoras: null,
        icono: null,
      },
    })
  })

  it('el nombre es obligatorio y llega a 60 caracteres (se cuentan caracteres, no unidades UTF-16)', () => {
    expect(errores(con({ nombre: '   ' }))).toEqual({ nombre: MENSAJES_DE_FASE.nombreVacio })
    expect(errores(con({ nombre: 'a'.repeat(61) }))).toEqual({
      nombre: MENSAJES_DE_FASE.nombreLargo,
    })
    expect(errores(con({ nombre: 'a'.repeat(60) }))).toBeNull()
    expect(errores(con({ nombre: '🚗'.repeat(60) }))).toBeNull()
  })

  it('las descripciones llegan a 500 y el nombre para el cliente a 60', () => {
    expect(errores(con({ descripcion: 'a'.repeat(501) }))).toEqual({
      descripcion: MENSAJES_DE_FASE.descripcionLarga,
    })
    expect(errores(con({ descripcionPortal: 'a'.repeat(501) }))).toEqual({
      descripcion_portal: MENSAJES_DE_FASE.descripcionLarga,
    })
    expect(errores(con({ aliasPortal: 'a'.repeat(61) }))).toEqual({
      alias_portal: MENSAJES_DE_FASE.aliasLargo,
    })
    expect(errores(con({ descripcion: 'a'.repeat(500), aliasPortal: 'a'.repeat(60) }))).toBeNull()
  })

  it('el color va como #rrggbb y el ícono como a-z, 0-9 y guion', () => {
    expect(errores(con({ color: 'azul' }))).toEqual({ color: MENSAJES_DE_FASE.colorMalo })
    expect(errores(con({ color: '#12345' }))).toEqual({ color: MENSAJES_DE_FASE.colorMalo })
    expect(errores(con({ color: '#ABCDEF' }))).toBeNull()
    expect(errores(con({ icono: 'Camión' }))).toEqual({ icono: MENSAJES_DE_FASE.iconoMalo })
    expect(errores(con({ icono: 'a'.repeat(41) }))).toEqual({ icono: MENSAJES_DE_FASE.iconoMalo })
    expect(errores(con({ icono: 'truck-2' }))).toBeNull()
  })

  it('la demora son días enteros desde 0 (vacío hereda, 0 apaga) y la alerta de 1 a 720 horas', () => {
    expect(errores(con({ demoraDias: '' }))).toBeNull()
    expect(errores(con({ demoraDias: '0' }))).toBeNull()
    expect(errores(con({ demoraDias: '-1' }))).toEqual({ demora_dias: MENSAJES_DE_FASE.demoraMala })
    expect(errores(con({ demoraDias: '1,5' }))).toEqual({
      demora_dias: MENSAJES_DE_FASE.demoraMala,
    })
    expect(errores(con({ alertaCadaHoras: '' }))).toBeNull()
    expect(errores(con({ alertaCadaHoras: '0' }))).toEqual({
      alerta_cada_horas: MENSAJES_DE_FASE.alertaMala,
    })
    expect(errores(con({ alertaCadaHoras: '721' }))).toEqual({
      alerta_cada_horas: MENSAJES_DE_FASE.alertaMala,
    })
    expect(errores(con({ alertaCadaHoras: '720' }))).toBeNull()
    expect(errores(con({ alertaCadaHoras: '1' }))).toBeNull()
  })
})

describe('validarFase: lo que depende de otro campo', () => {
  it('inicial y final a la vez dice el error en «es_final», como la base', () => {
    expect(errores(con({ esInicial: true, esFinal: true }))).toEqual({
      es_final: MENSAJES_DE_FASE.inicialYFinal,
    })
  })

  it('visible en el portal pide el nombre para el cliente', () => {
    expect(errores(con({ visiblePortal: true }))).toEqual({
      alias_portal: MENSAJES_DE_FASE.portalSinAlias,
    })
    expect(errores(con({ visiblePortal: true, aliasPortal: ' ' }))).toEqual({
      alias_portal: MENSAJES_DE_FASE.portalSinAlias,
    })
    expect(errores(con({ visiblePortal: true, aliasPortal: 'En camino' }))).toBeNull()
  })

  it('un nombre para el cliente demasiado largo se dice antes que el faltante, y una sola vez', () => {
    expect(errores(con({ visiblePortal: true, aliasPortal: 'a'.repeat(61) }))).toEqual({
      alias_portal: MENSAJES_DE_FASE.aliasLargo,
    })
  })
})

describe('validarFase con las reglas del flujo', () => {
  it('cada interruptor con la regla apagada del flujo dice la suya, en su campo', () => {
    expect(errores(con({ publicaWeb: true }), SIN_REGLAS)).toEqual({
      publica_web: MENSAJES_DE_FASE.vitrinaApagada,
    })
    expect(errores(con({ visiblePortal: true, aliasPortal: 'x' }), SIN_REGLAS)).toEqual({
      visible_portal: MENSAJES_DE_FASE.portalApagado,
    })
    expect(errores(con({ permiteAduana: true }), SIN_REGLAS)).toEqual({
      permite_aduana: MENSAJES_DE_FASE.aduanaApagada,
    })
    expect(errores(con({ esLogistica: true }), SIN_REGLAS)).toEqual({
      es_logistica: MENSAJES_DE_FASE.logisticaApagada,
    })
    expect(errores(con({ publicaWeb: true, permiteAduana: true, esLogistica: true }))).toBeNull()
  })

  it('una regla apagada sin la fase marcada no estorba', () => {
    expect(errores(con({ nombre: 'Otra' }), SIN_REGLAS)).toBeNull()
  })

  it('varios errores a la vez, cada uno en su campo', () => {
    expect(errores(con({ nombre: '', color: 'x', demoraDias: 'x' }))).toEqual({
      nombre: MENSAJES_DE_FASE.nombreVacio,
      color: MENSAJES_DE_FASE.colorMalo,
      demora_dias: MENSAJES_DE_FASE.demoraMala,
    })
  })
})

describe('motivoDelInterruptor', () => {
  it('con la regla encendida, se puede', () => {
    expect(motivoDelInterruptor('publica_web', false, VEHICULOS)).toBeNull()
    expect(motivoDelInterruptor('es_logistica', false, REPUESTOS)).toBeNull()
  })

  it('con la regla apagada no se puede encender y se dice cuál es', () => {
    expect(motivoDelInterruptor('permite_aduana', false, SIN_REGLAS)).toBe(
      'La regla «Aduana» está apagada en este flujo.',
    )
    expect(motivoDelInterruptor('visible_portal', false, SIN_REGLAS)).toBe(
      'La regla «Portal del cliente» está apagada en este flujo.',
    )
  })

  it('en repuestos, web, portal y aduana no existen (D9)', () => {
    for (const campo of ['publica_web', 'visible_portal', 'permite_aduana'] as const) {
      expect(motivoDelInterruptor(campo, false, REPUESTOS)).toBe(MOTIVO_NO_EXISTE_EN_REPUESTOS)
    }
  })

  it('un interruptor ya encendido (dato viejo) siempre se puede apagar (D10)', () => {
    expect(motivoDelInterruptor('permite_aduana', true, SIN_REGLAS)).toBeNull()
    expect(motivoDelInterruptor('publica_web', true, REPUESTOS)).toBeNull()
  })
})

describe('otraFaseInicial', () => {
  const f = (id: string, nombre: string, esInicial: boolean, activa = true) => ({
    id,
    nombre,
    esInicial,
    activa,
  })
  it('nombra otra inicial activa, no la propia ni una jubilada', () => {
    const fases = [f('a', 'Subasta', true), f('b', 'Pagada', false), f('c', 'Vieja', true, false)]
    expect(otraFaseInicial(fases, 'b')).toBe('Subasta')
    expect(otraFaseInicial(fases, 'a')).toBeNull()
    expect(otraFaseInicial(fases, null)).toBe('Subasta')
    expect(avisoDeOtraInicial('Subasta')).toContain('«Subasta»')
  })
})

describe('textos y campos', () => {
  it('conoce los campos de la base y no otros', () => {
    expect(esCampoDeFase('alias_portal')).toBe(true)
    expect(esCampoDeFase('id')).toBe(false)
    expect(esCampoDeFase(undefined)).toBe(false)
    expect(esCampoDeFase(null)).toBe(false)
  })

  it('el nombre repetido dice cuál', () => {
    expect(nombreRepetido('En puerto')).toBe('Ya hay una fase «En puerto» en este flujo.')
  })
})

describe('es la subasta', () => {
  it('sólo en el flujo de un origen de subasta y nunca con la final, con los textos de la base', () => {
    expect(errores(con({ esSubasta: true }), SUBASTA)).toBeNull()
    expect(errores(con({ esSubasta: true }))).toEqual({
      es_subasta: MENSAJES_DE_FASE.subastaFueraDeOrigen,
    })
    expect(errores(con({ esSubasta: true }), REPUESTOS)).toMatchObject({
      es_subasta: MENSAJES_DE_FASE.subastaFueraDeOrigen,
    })
    expect(errores(con({ esSubasta: true, esFinal: true }), SUBASTA)).toEqual({
      es_subasta: MENSAJES_DE_FASE.subastaFinal,
    })
  })

  it('apaga el interruptor fuera de un origen de subasta, salvo para apagar un dato viejo', () => {
    expect(motivoDeEsSubasta(false, SUBASTA)).toBeNull()
    expect(motivoDeEsSubasta(false, VEHICULOS)).toBe(MOTIVO_SOLO_EN_SUBASTA)
    expect(motivoDeEsSubasta(false, REPUESTOS)).toBe(MOTIVO_SOLO_EN_SUBASTA)
    expect(motivoDeEsSubasta(true, VEHICULOS)).toBeNull()
  })
})
