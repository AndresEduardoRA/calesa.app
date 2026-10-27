import { describe, expect, it } from 'vitest'
import type { ResultadoDeCrear } from './guardado'
import {
  leerPendiente,
  queEnviar,
  serializarPendiente,
  trasElEnvio,
  type EnvioDeGuardado,
} from './intento-de-guardado'
import type { PedidoDeGuardado } from './pedido-de-guardado'

const pedido = (intento: string, valor: number): PedidoDeGuardado => ({
  intento,
  origenId: 'o',
  leadId: 'l',
  vehiculoId: null,
  abierta: 'f.1.ab',
  entradas: { inputs: { pub: valor }, banderas: {}, overrides: {} },
  conLaAbierta: false,
})

const ok = (resultado: ResultadoDeCrear): EnvioDeGuardado => ({ ok: true, data: resultado })
const rechazo = (motivo: Extract<ResultadoDeCrear, { tipo: 'rechazo' }>['motivo']) =>
  ok({ tipo: 'rechazo', motivo })

describe('queEnviar', () => {
  it('sin pendiente manda lo nuevo, con su intento', () => {
    expect(queEnviar(null, pedido('b', 2))).toEqual({ pedido: pedido('b', 2), esReenvio: false })
  })

  it('con un pendiente reenvía ese pedido y ese intento, aunque lo nuevo sea otro (4-21)', () => {
    expect(queEnviar(pedido('a', 1), pedido('b', 2))).toEqual({
      pedido: pedido('a', 1),
      esReenvio: true,
    })
  })
})

describe('trasElEnvio', () => {
  it.each<[string, EnvioDeGuardado]>([
    ['sin red', { ok: false, sinRed: true, error: { codigo: 'inesperado', mensaje: '' } }],
    ['respuesta perdida', ok({ tipo: 'perdida' })],
    [
      'la sesión venció antes de correr',
      { ok: false, error: { codigo: 'no_autenticado', mensaje: '' } },
    ],
    ['la action lanzó', { ok: false, error: { codigo: 'inesperado', mensaje: '' } }],
  ])('conserva el pendiente: %s', (_, envio) => {
    expect(trasElEnvio(envio)).toBe('conservar')
  })

  it.each<[string, EnvioDeGuardado]>([
    ['la entrada no pasó el esquema', { ok: false, error: { codigo: 'validacion', mensaje: '' } }],
    ['un código desconocido (XX000) es transitorio, con SQLSTATE', rechazo('transitorio')],
    ['un 22023 determinista', rechazo('otro')],
    [
      'guardada',
      ok({ tipo: 'guardada', cotizacion: { id: 'c', numero: 1, totalUsd: 1, repetido: false } }),
    ],
    ['D2', rechazo('desactualizada_formula')],
    ['recargar la hoja', rechazo('recargar_hoja')],
    ['sin acceso', rechazo('sin_acceso')],
    ['la sesión de la base', rechazo('sesion')],
  ])('suelta el pendiente: %s', (_, envio) => {
    expect(trasElEnvio(envio)).toBe('soltar')
  })
})

describe('el pendiente en la pestaña', () => {
  it('sobrevive a serializarse y leerse', () => {
    expect(leerPendiente(serializarPendiente(pedido('a', 1)))).toEqual(pedido('a', 1))
  })

  it('uno ilegible, o que no es un pedido, da nulo', () => {
    expect(leerPendiente(null)).toBeNull()
    expect(leerPendiente('{no es json')).toBeNull()
    expect(leerPendiente(JSON.stringify({ intento: 'a' }))).toBeNull()
  })
})
