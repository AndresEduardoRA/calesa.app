import { describe, expect, it } from 'vitest'
import {
  cursorDe,
  fundirPagina,
  idDeConversacionEnLaUrl,
  idDeUsuarioEnLaUrl,
  leerNoLeidos,
  leerPaginaDeConversaciones,
  sumarPagina,
  textoDeNoLeidos,
  tituloDe,
  type Conversacion,
} from './conversaciones'

const ID_A = '11111111-1111-4111-8111-111111111111'
const ID_B = '22222222-2222-4222-8222-222222222222'
const ID_C = '33333333-3333-4333-8333-333333333333'

function fila(id: string, ultimo: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    tipo: 'directa',
    nombre: null,
    es_global: false,
    ultimo_mensaje_en: ultimo,
    ultimo_leido_en: null,
    silenciada: false,
    no_leidos: 0,
    otro: { id: ID_C, nombre: 'Rosa' },
    ...extra,
  }
}

function conversacion(
  id: string,
  ultimo: string,
  extra: Record<string, unknown> = {},
): Conversacion {
  const lectura = leerPaginaDeConversaciones({
    conversaciones: [fila(id, ultimo, extra)],
    hay_mas: false,
  })
  const primera = lectura.ok ? lectura.data.conversaciones[0] : undefined
  if (!primera) {
    throw new Error('fila de prueba inválida')
  }
  return primera
}

const ids = (filas: readonly Conversacion[]) => filas.map((c) => c.id)

describe('textoDeNoLeidos', () => {
  it('no dice nada con cero, el número hasta 99 y «99+» desde 100', () => {
    expect(textoDeNoLeidos(0)).toBeNull()
    expect(textoDeNoLeidos(1)).toBe('1')
    expect(textoDeNoLeidos(99)).toBe('99')
    expect(textoDeNoLeidos(100)).toBe('99+')
    expect(textoDeNoLeidos(250)).toBe('99+')
  })
})

describe('leerPaginaDeConversaciones', () => {
  it('acepta lo que devuelve la base', () => {
    const lectura = leerPaginaDeConversaciones({
      conversaciones: [
        fila(ID_A, '2026-11-12T10:00:00Z', { no_leidos: 3 }),
        fila(ID_B, '2026-11-12T09:00:00Z', { tipo: 'grupo', nombre: 'Taller', otro: null }),
      ],
      hay_mas: true,
    })
    expect(lectura.ok).toBe(true)
    if (!lectura.ok) {
      return
    }
    expect(lectura.data.hayMas).toBe(true)
    expect(lectura.data.conversaciones[0]).toMatchObject({
      id: ID_A,
      tipo: 'directa',
      noLeidos: 3,
      otro: { id: ID_C, nombre: 'Rosa' },
    })
    expect(lectura.data.conversaciones[1]).toMatchObject({ tipo: 'grupo', otro: null })
  })

  it('el canal global es de tipo global', () => {
    const c = conversacion(ID_A, '2026-11-12T10:00:00Z', {
      tipo: 'grupo',
      nombre: 'Equipo',
      es_global: true,
      otro: null,
    })
    expect(c.tipo).toBe('global')
    expect(c.esGlobal).toBe(true)
  })

  it('rechaza una fila sin id o con no leídos fuera de 0 a 100, sin lanzar', () => {
    const sinId = leerPaginaDeConversaciones({
      conversaciones: [{ ...fila(ID_A, '2026-11-12T10:00:00Z'), id: undefined }],
      hay_mas: false,
    })
    const fuera = leerPaginaDeConversaciones({
      conversaciones: [fila(ID_A, '2026-11-12T10:00:00Z', { no_leidos: 101 })],
      hay_mas: false,
    })
    const basura = leerPaginaDeConversaciones('no es json')
    expect(sinId.ok).toBe(false)
    expect(fuera.ok).toBe(false)
    expect(basura.ok).toBe(false)
  })
})

describe('fundirPagina', () => {
  it('pone arriba la que recibió un mensaje y no duplica', () => {
    const cargadas = [
      conversacion(ID_A, '2026-11-12T10:00:00Z'),
      conversacion(ID_B, '2026-11-12T09:00:00Z'),
    ]
    const frescas = [
      conversacion(ID_B, '2026-11-12T11:00:00Z', { no_leidos: 1 }),
      conversacion(ID_A, '2026-11-12T10:00:00Z'),
    ]
    const fundidas = fundirPagina(cargadas, frescas, false)
    expect(ids(fundidas)).toEqual([ID_B, ID_A])
    expect(fundidas[0]?.noLeidos).toBe(1)
  })

  it('la señal que relee la cabeza no borra las páginas ya cargadas más abajo', () => {
    const cargadas = [
      conversacion(ID_A, '2026-11-12T10:00:00Z'),
      conversacion(ID_B, '2026-11-12T09:00:00Z'),
      conversacion(ID_C, '2026-11-12T08:00:00Z'),
    ]
    const frescas = [conversacion(ID_A, '2026-11-12T10:30:00Z')]
    expect(ids(fundirPagina(cargadas, frescas, true))).toEqual([ID_A, ID_B, ID_C])
  })
})

describe('sumarPagina', () => {
  it('suma al final sin repetir lo que ya estaba', () => {
    const cargadas = [conversacion(ID_A, '2026-11-12T10:00:00Z')]
    const siguientes = [
      conversacion(ID_A, '2026-11-12T10:00:00Z'),
      conversacion(ID_B, '2026-11-12T09:00:00Z'),
    ]
    expect(ids(sumarPagina(cargadas, siguientes))).toEqual([ID_A, ID_B])
  })
})

describe('cursorDe', () => {
  it('es la hora del último mensaje y el id', () => {
    const c = conversacion(ID_A, '2026-11-12T10:00:00Z')
    expect(cursorDe(c)).toEqual({ ultimoMensajeEn: '2026-11-12T10:00:00Z', id: ID_A })
  })
})

describe('tituloDe', () => {
  it('una directa se llama como la otra persona; un grupo, como su nombre', () => {
    expect(tituloDe(conversacion(ID_A, '2026-11-12T10:00:00Z'))).toBe('Rosa')
    expect(
      tituloDe(
        conversacion(ID_B, '2026-11-12T10:00:00Z', { tipo: 'grupo', nombre: 'Taller', otro: null }),
      ),
    ).toBe('Taller')
  })

  it('sin nombre queda «Conversación»', () => {
    expect(
      tituloDe(
        conversacion(ID_B, '2026-11-12T10:00:00Z', { tipo: 'grupo', nombre: null, otro: null }),
      ),
    ).toBe('Conversación')
  })
})

describe('idDeConversacionEnLaUrl', () => {
  it('acepta un GUID y descarta lo ilegible', () => {
    expect(idDeConversacionEnLaUrl(ID_A)).toBe(ID_A)
    expect(idDeConversacionEnLaUrl('abc')).toBeNull()
    expect(idDeConversacionEnLaUrl('')).toBeNull()
    expect(idDeConversacionEnLaUrl(null)).toBeNull()
    expect(idDeConversacionEnLaUrl(`${ID_A}xyz`)).toBeNull()
  })
})

describe('idDeUsuarioEnLaUrl', () => {
  it('acepta un GUID y descarta lo ilegible', () => {
    expect(idDeUsuarioEnLaUrl(ID_A)).toBe(ID_A)
    expect(idDeUsuarioEnLaUrl('abc')).toBeNull()
    expect(idDeUsuarioEnLaUrl('')).toBeNull()
    expect(idDeUsuarioEnLaUrl(null)).toBeNull()
    expect(idDeUsuarioEnLaUrl(undefined)).toBeNull()
    expect(idDeUsuarioEnLaUrl(`${ID_A}xyz`)).toBeNull()
  })
})

describe('leerNoLeidos', () => {
  it('acepta un entero de 0 a 100 y rechaza lo demás como valor', () => {
    expect(leerNoLeidos(0)).toEqual({ ok: true, data: 0 })
    expect(leerNoLeidos(100)).toEqual({ ok: true, data: 100 })
    for (const malo of [-1, 101, 2.5, '3', null, undefined, {}]) {
      expect(leerNoLeidos(malo).ok).toBe(false)
    }
  })
})
