import { describe, expect, it } from 'vitest'
import type { ResultadoDeCrear } from './guardado'
import {
  leerPendiente,
  leerPendienteDeEdicion,
  queEnviar,
  serializarPendiente,
  serializarPendienteDeEdicion,
  trasElEnvio,
  type EnvioDeGuardado,
} from './intento-de-guardado'
import type { PedidoDeEdicion } from './pedido-de-edicion'
import type { PedidoDeGuardado } from './pedido-de-guardado'

const pedido = (intento: string, valor: number): PedidoDeGuardado => ({
  intento,
  origenId: 'o',
  leadId: 'l',
  vehiculoId: null,
  abierta: 'f.1.ab',
  entradas: { inputs: { pub: valor }, banderas: {}, overrides: {} },
  modoTc: null,
  verTotalBs: false,
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

  it('un pendiente de antes, sin modoTc ni verTotalBs, se lee con nulo y falso; uno con ellos, igual', () => {
    const { modoTc: _, verTotalBs: __, ...viejo } = pedido('a', 1)
    expect(leerPendiente(JSON.stringify(viejo))).toEqual(pedido('a', 1))
    const conModo = { ...pedido('b', 2), modoTc: 'unificado', verTotalBs: true }
    expect(leerPendiente(serializarPendiente(conModo))).toEqual(conModo)
  })
})

describe('el pendiente de una edición (4.15-3, C9)', () => {
  const edicion = (intento: string): PedidoDeEdicion => ({
    intento,
    cotizacionId: 'c',
    actualizadoEn: '2026-11-03T14:20:31.123456+00:00',
    entradas: { inputs: { pub: 1 }, banderas: { b: true }, overrides: { o: 2 }, variante: 'v' },
    modoTc: 'paralelo',
    verTotalBs: true,
    titulo: 'T',
    notas: null,
    vehiculoId: null,
  })

  it('va y vuelve igual, con la versión en texto (con sus microsegundos)', () => {
    const p = edicion('a')
    expect(leerPendienteDeEdicion(serializarPendienteDeEdicion(p))).toEqual(p)
  })

  it('el pedido de una nueva no se lee como una edición, ni al revés', () => {
    expect(leerPendienteDeEdicion(serializarPendiente(pedido('a', 1)))).toBeNull()
    expect(leerPendiente(serializarPendienteDeEdicion(edicion('a')))).toBeNull()
  })

  it('lo ilegible o ausente se ignora', () => {
    expect(leerPendienteDeEdicion(null)).toBeNull()
    expect(leerPendienteDeEdicion('{no es json')).toBeNull()
    expect(leerPendienteDeEdicion(JSON.stringify({ intento: 'a' }))).toBeNull()
  })

  it('queEnviar sirve a una edición: con pendiente, el pendiente y es un reenvío', () => {
    expect(queEnviar(edicion('a'), edicion('b'))).toEqual({
      pedido: edicion('a'),
      esReenvio: true,
    })
  })
})
