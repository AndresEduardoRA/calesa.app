import { describe, expect, it } from 'vitest'
import {
  aplicarResultado,
  bordeDelDia,
  cursorDeMensaje,
  fundirCabeza,
  fundirMensajes,
  LARGO_MAXIMO,
  leerMensajes,
  leerResultadoDeEnvio,
  mensajeLocal,
  textoValido,
  ultimoDeOtro,
  type Mensaje,
} from './mensajes'

const YO = '11111111-1111-4111-8111-111111111111'
const OTRA = '22222222-2222-4222-8222-222222222222'
const CONVERSACION = '33333333-3333-4333-8333-333333333333'

function id(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
}

function mensaje(n: number, extra: Partial<Mensaje> = {}): Mensaje {
  return {
    id: id(n),
    conversacionId: CONVERSACION,
    autorId: OTRA,
    autorNombre: 'Marta',
    tipo: 'texto',
    cuerpo: `mensaje ${String(n)}`,
    creadoEn: `2026-11-12T10:00:${String(n).padStart(2, '0')}+00:00`,
    editadoEn: null,
    eliminadoEn: null,
    respondeAId: null,
    estado: 'enviado',
    ...extra,
  }
}

function fila(n: number, extra: Record<string, unknown> = {}) {
  return {
    id: id(n),
    conversacion_id: CONVERSACION,
    autor_id: OTRA,
    tipo: 'texto',
    cuerpo: `mensaje ${String(n)}`,
    creado_en: `2026-11-12T10:00:${String(n).padStart(2, '0')}+00:00`,
    editado_en: null,
    eliminado_en: null,
    responde_a_id: null,
    autor: { nombre: 'Marta' },
    ...extra,
  }
}

const ids = (mensajes: readonly Mensaje[]) => mensajes.map((m) => m.id)

describe('fundirMensajes', () => {
  it('no duplica por id: manda la fila del servidor', () => {
    const cargados = [mensaje(1), mensaje(2)]
    const nuevos = [mensaje(2, { cuerpo: 'editado', editadoEn: '2026-11-12T10:05:00+00:00' })]
    const fundidos = fundirMensajes(cargados, nuevos)
    expect(ids(fundidos)).toEqual([id(1), id(2)])
    expect(fundidos[1]?.cuerpo).toBe('editado')
  })

  it('el optimista que vuelve por la señal con el mismo id queda uno y enviado', () => {
    const local = mensaje(5, { autorId: YO, estado: 'enviando' })
    const fundidos = fundirMensajes([mensaje(1), local], [mensaje(5, { autorId: YO })])
    expect(ids(fundidos)).toEqual([id(1), id(5)])
    expect(fundidos[1]?.estado).toBe('enviado')
  })

  it('lo enviando y lo fallido van al final aunque su creadoEn sea anterior', () => {
    const pendiente = mensaje(1, { estado: 'enviando', creadoEn: '2026-11-12T09:00:00+00:00' })
    const fallido = mensaje(2, { estado: 'fallido', creadoEn: '2026-11-12T09:00:01+00:00' })
    const fundidos = fundirMensajes([pendiente, fallido, mensaje(3)], [mensaje(4)])
    expect(ids(fundidos)).toEqual([id(3), id(4), id(1), id(2)])
  })

  it('ordena lo enviado por (creadoEn, id)', () => {
    const mismoInstante = '2026-11-12T10:00:30+00:00'
    const fundidos = fundirMensajes(
      [mensaje(9, { creadoEn: mismoInstante })],
      [mensaje(7, { creadoEn: mismoInstante }), mensaje(1)],
    )
    expect(ids(fundidos)).toEqual([id(1), id(7), id(9)])
  })

  it('un instante con fracción y otro sin ella se comparan como instantes', () => {
    const fundidos = fundirMensajes(
      [mensaje(1, { creadoEn: '2026-11-12T10:00:00.5+00:00' })],
      [mensaje(2, { creadoEn: '2026-11-12T10:00:00+00:00' })],
    )
    expect(ids(fundidos)).toEqual([id(2), id(1)])
  })
})

describe('fundirCabeza', () => {
  it('sin hueco funde y deja hayAnteriores como estaba', () => {
    const cargados = [mensaje(1), mensaje(2), mensaje(3)]
    const resultado = fundirCabeza(cargados, [mensaje(3), mensaje(4)], true, false)
    expect(ids(resultado.mensajes)).toEqual([id(1), id(2), id(3), id(4)])
    expect(resultado.hayAnteriores).toBe(false)
  })

  it('con hueco (más atrás y ningún id conocido) reemplaza y conserva los pendientes', () => {
    const cargados = [mensaje(1), mensaje(2), mensaje(3, { estado: 'fallido', autorId: YO })]
    const resultado = fundirCabeza(cargados, [mensaje(10), mensaje(11)], true, false)
    expect(ids(resultado.mensajes)).toEqual([id(10), id(11), id(3)])
    expect(resultado.hayAnteriores).toBe(true)
  })

  it('sin más atrás no hay hueco aunque no se conozca ninguno', () => {
    const resultado = fundirCabeza([mensaje(1)], [mensaje(2)], false, false)
    expect(ids(resultado.mensajes)).toEqual([id(1), id(2)])
    expect(resultado.hayAnteriores).toBe(false)
  })

  it('un hilo que aún no tenía nada enviado no tiene hueco', () => {
    const resultado = fundirCabeza([], [mensaje(1), mensaje(2)], true, true)
    expect(ids(resultado.mensajes)).toEqual([id(1), id(2)])
    expect(resultado.hayAnteriores).toBe(true)
  })
})

describe('textoValido', () => {
  it('vacío o sólo espacios no se envía y no dice nada', () => {
    expect(textoValido('')).toEqual({ ok: false, motivo: 'vacio' })
    expect(textoValido('  \n  ')).toEqual({ ok: false, motivo: 'vacio' })
  })

  it('recorta los extremos', () => {
    expect(textoValido('  hola \n')).toEqual({ ok: true, cuerpo: 'hola' })
  })

  it('4.000 pasa y 4.001 es largo, con su motivo', () => {
    expect(textoValido('a'.repeat(LARGO_MAXIMO))).toMatchObject({ ok: true })
    const largo = textoValido('a'.repeat(LARGO_MAXIMO + 1))
    expect(largo).toMatchObject({ ok: false, motivo: 'largo' })
    expect(largo.ok === false && largo.mensaje).toMatch(/supera los 4.000 caracteres/)
  })
})

describe('bordeDelDia', () => {
  it('es el inicio del día siguiente en la zona (exclusivo)', () => {
    expect(bordeDelDia('2026-11-12', 'America/La_Paz')).toBe('2026-11-13T04:00:00.000Z')
  })
})

describe('ultimoDeOtro', () => {
  it('ignora lo propio, lo que está enviando y lo eliminado', () => {
    const mensajes = [
      mensaje(1),
      mensaje(2, { eliminadoEn: '2026-11-12T10:10:00+00:00', cuerpo: null }),
      mensaje(3, { autorId: YO }),
      mensaje(4, { estado: 'enviando' }),
    ]
    expect(ultimoDeOtro(mensajes, YO)?.id).toBe(id(1))
  })

  it('es null si no hay de otra persona', () => {
    expect(ultimoDeOtro([mensaje(1, { autorId: YO })], YO)).toBeNull()
  })
})

describe('mensajeLocal y cursorDeMensaje', () => {
  it('el local nace enviando, con el id del navegador', () => {
    const local = mensajeLocal({
      id: id(7),
      conversacion: CONVERSACION,
      cuerpo: 'hola',
      yo: YO,
      nombre: 'Ana',
      ahora: '2026-11-12T11:00:00.000Z',
    })
    expect(local).toMatchObject({ id: id(7), autorId: YO, estado: 'enviando', cuerpo: 'hola' })
  })

  it('el cursor lleva el instante tal cual y el id', () => {
    expect(cursorDeMensaje(mensaje(3))).toEqual({
      instante: '2026-11-12T10:00:03+00:00',
      id: id(3),
      sentido: 'siguiente',
    })
  })
})

describe('leerMensajes', () => {
  it('acepta una fila con autor y otra sin él', () => {
    const lectura = leerMensajes([fila(2), fila(1, { autor: null })], 20)
    expect(lectura.ok).toBe(true)
    if (lectura.ok) {
      expect(lectura.data.mensajes[0]?.autorNombre).toBeNull()
      expect(lectura.data.mensajes[1]?.autorNombre).toBe('Marta')
    }
  })

  it('rechaza una fila sin id', () => {
    expect(leerMensajes([fila(1, { id: undefined })], 20).ok).toBe(false)
  })

  it('con 21 filas devuelve 20 y hayMas, de más viejo a más nuevo', () => {
    const filas = Array.from({ length: 21 }, (_, i) => fila(21 - i))
    const lectura = leerMensajes(filas, 20)
    expect(lectura.ok).toBe(true)
    if (lectura.ok) {
      expect(lectura.data.hayMas).toBe(true)
      expect(lectura.data.mensajes).toHaveLength(20)
      expect(lectura.data.mensajes[0]?.id).toBe(id(2))
      expect(lectura.data.mensajes.at(-1)?.id).toBe(id(21))
    }
  })

  it('con menos filas que el tamaño no hay más', () => {
    const lectura = leerMensajes([fila(2), fila(1)], 20)
    expect(lectura.ok && lectura.data.hayMas).toBe(false)
  })
})

describe('leerResultadoDeEnvio', () => {
  it('acepta enviado y repetido', () => {
    for (const resultado of ['enviado', 'repetido']) {
      const lectura = leerResultadoDeEnvio({
        resultado,
        id: id(1),
        creado_en: '2026-11-12T10:00:01+00:00',
      })
      expect(lectura).toEqual({
        ok: true,
        data: { id: id(1), creadoEn: '2026-11-12T10:00:01+00:00' },
      })
    }
  })

  it('rechaza otro resultado', () => {
    const lectura = leerResultadoDeEnvio({ resultado: 'quien-sabe', id: id(1), creado_en: 'x' })
    expect(lectura.ok).toBe(false)
  })
})

describe('aplicarResultado', () => {
  const pendiente = mensaje(1, { autorId: YO, estado: 'enviando' })

  it('enviado toma el instante del servidor', () => {
    const [m] = aplicarResultado([pendiente], id(1), {
      estado: 'enviado',
      creadoEn: '2026-11-12T10:30:00+00:00',
    })
    expect(m).toMatchObject({ estado: 'enviado', creadoEn: '2026-11-12T10:30:00+00:00' })
  })

  it('fallido guarda el motivo y reintentar lo borra', () => {
    const fallido = aplicarResultado([pendiente], id(1), { estado: 'fallido', motivo: 'Sin red' })
    expect(fallido[0]).toMatchObject({ estado: 'fallido', motivoDelFallo: 'Sin red' })
    const otraVez = aplicarResultado(fallido, id(1), { estado: 'enviando' })
    expect(otraVez[0]?.estado).toBe('enviando')
    expect(otraVez[0]?.motivoDelFallo).toBeUndefined()
  })

  it('un mensaje que la señal ya trajo como enviado no vuelve a fallido', () => {
    const enviado = mensaje(1, { autorId: YO })
    const [m] = aplicarResultado([enviado], id(1), { estado: 'fallido', motivo: 'Sin red' })
    expect(m?.estado).toBe('enviado')
  })

  it('no toca los demás', () => {
    const otros = aplicarResultado([mensaje(2), pendiente], id(1), {
      estado: 'fallido',
      motivo: 'x',
    })
    expect(otros[0]?.id).toBe(id(2))
    expect(otros[0]?.estado).toBe('enviado')
  })
})
