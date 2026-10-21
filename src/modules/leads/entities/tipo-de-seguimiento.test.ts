import { describe, expect, it } from 'vitest'
import {
  alTopeDeTiposDeSeguimiento,
  cambiosDeTipoDeSeguimiento,
  destinoDeTipoDeSeguimiento,
  firmaDeTiposDeSeguimiento,
  listaDeTiposDeSeguimientoDesde,
  motivoDeUrlDeTipoDeSeguimiento,
  motivoParaNoAbrirTipoDeSeguimiento,
  motivoParaNoEliminar,
  motivoParaNoEliminarPorUrl,
  normalizarNombreDeTipoDeSeguimiento,
  respuestaDeTiposDeSeguimientoDesde,
  sinTiposActivos,
  textoDelLugarDeTipoDeSeguimiento,
  tipoDeSeguimientoPorId,
  validarNombreDeTipoDeSeguimiento,
  validarTipoDeSeguimiento,
  type TipoDeSeguimientoConUso,
} from './tipo-de-seguimiento'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'

const tipo = (id: string, nombre: string, resto: Partial<TipoDeSeguimientoConUso> = {}) => ({
  id,
  clave: nombre.toLowerCase(),
  nombre,
  icono: null,
  activo: true,
  orden: 10,
  actualizadoEn: '2026-10-21T10:00:00Z',
  conSeguimientos: false,
  ...resto,
})

const TIPOS = [tipo(A, 'WhatsApp'), tipo(B, 'Llamada'), tipo(C, 'Visita')]

const cruda = (id: string, nombre: string) => ({
  id,
  clave: nombre.toLowerCase(),
  nombre,
  icono: 'telefono',
  activo: true,
  orden: 10,
  actualizado_en: '2026-10-21T10:00:00Z',
  con_seguimientos: true,
})

describe('listaDeTiposDeSeguimientoDesde', () => {
  it('lee la lista y el tope que entrega la base', () => {
    const lista = listaDeTiposDeSeguimientoDesde({ tope: 100, tipos: [cruda(A, 'Llamada')] })
    expect(lista?.tope).toBe(100)
    expect(lista?.tipos[0]).toMatchObject({ id: A, icono: 'telefono', conSeguimientos: true })
  })

  it('una forma rota es nula, no una lista vacía', () => {
    expect(listaDeTiposDeSeguimientoDesde({ tope: 0, tipos: [] })).toBeNull()
    expect(listaDeTiposDeSeguimientoDesde({ tope: 100, tipos: [{ id: 'x' }] })).toBeNull()
    expect(listaDeTiposDeSeguimientoDesde(null)).toBeNull()
  })

  it('acepta un tipo sin icono', () => {
    const lista = listaDeTiposDeSeguimientoDesde({
      tope: 100,
      tipos: [{ ...cruda(A, 'Nota'), icono: null }],
    })
    expect(lista?.tipos[0]?.icono).toBeNull()
  })
})

describe('respuestaDeTiposDeSeguimientoDesde', () => {
  const lista = { tope: 100, tipos: [cruda(A, 'Llamada')] }

  it('lee el id, la lista y si fue un reintento (repetido o sin cambios)', () => {
    expect(respuestaDeTiposDeSeguimientoDesde({ id: A, repetido: false, lista })).toMatchObject({
      id: A,
      repetido: false,
    })
    expect(respuestaDeTiposDeSeguimientoDesde({ id: A, repetido: true, lista })?.repetido).toBe(
      true,
    )
    expect(respuestaDeTiposDeSeguimientoDesde({ id: A, sin_cambios: true, lista })?.repetido).toBe(
      true,
    )
  })

  it('eliminar no trae id', () => {
    expect(respuestaDeTiposDeSeguimientoDesde({ lista })?.id).toBeNull()
  })

  it('con la lista rota no hay respuesta', () => {
    expect(respuestaDeTiposDeSeguimientoDesde({ id: A, lista: { tope: 100 } })).toBeNull()
  })
})

describe('el nombre', () => {
  it('se normaliza como en la base', () => {
    expect(normalizarNombreDeTipoDeSeguimiento('  Mensaje   de  voz ')).toBe('Mensaje de voz')
  })

  it('es obligatorio, de hasta 40 caracteres y único sin importar mayúsculas', () => {
    expect(validarNombreDeTipoDeSeguimiento('   ', TIPOS, null)).toEqual({
      ok: false,
      motivo: 'Escribe el nombre del tipo de seguimiento.',
    })
    expect(validarNombreDeTipoDeSeguimiento('x'.repeat(41), TIPOS, null)).toMatchObject({
      ok: false,
      motivo: 'El nombre del tipo de seguimiento admite hasta 40 caracteres.',
    })
    expect(validarNombreDeTipoDeSeguimiento('x'.repeat(40), TIPOS, null).ok).toBe(true)
    expect(validarNombreDeTipoDeSeguimiento('  LLAMADA ', TIPOS, null)).toEqual({
      ok: false,
      motivo: 'Ya hay un tipo de seguimiento «LLAMADA».',
    })
  })

  it('el propio nombre no cuenta como repetido consigo mismo', () => {
    expect(validarNombreDeTipoDeSeguimiento('Llamada', TIPOS, B)).toEqual({
      ok: true,
      nombre: 'Llamada',
    })
  })

  it('cuenta caracteres, no unidades: una tilde o un emoji cuentan uno', () => {
    expect(validarNombreDeTipoDeSeguimiento('é'.repeat(40), TIPOS, null).ok).toBe(true)
    expect(validarNombreDeTipoDeSeguimiento('📞'.repeat(40), TIPOS, null).ok).toBe(true)
  })
})

describe('validarTipoDeSeguimiento', () => {
  it('rechaza el nombre con su campo y acepta uno válido', () => {
    expect(validarTipoDeSeguimiento('', TIPOS, null)).toEqual({
      ok: false,
      motivos: { nombre: 'Escribe el nombre del tipo de seguimiento.' },
    })
    expect(validarTipoDeSeguimiento(' Radio ', TIPOS, null)).toEqual({ ok: true, nombre: 'Radio' })
  })
})

describe('cambiosDeTipoDeSeguimiento', () => {
  const original = tipo(A, 'WhatsApp', { icono: 'mensaje' })

  it('sólo manda lo que cambió', () => {
    expect(cambiosDeTipoDeSeguimiento(original, 'WhatsApp', 'mensaje')).toEqual({})
    expect(cambiosDeTipoDeSeguimiento(original, 'WA', 'mensaje')).toEqual({ nombre: 'WA' })
    expect(cambiosDeTipoDeSeguimiento(original, 'WhatsApp', 'casa')).toEqual({ icono: 'casa' })
    expect(cambiosDeTipoDeSeguimiento(original, 'WhatsApp', null)).toEqual({ icono: null })
  })

  it('un icono que ya no se conoce, sin tocar, no viaja', () => {
    const raro = tipo(A, 'WhatsApp', { icono: 'message-circle' })
    expect(cambiosDeTipoDeSeguimiento(raro, 'WA', 'message-circle')).toEqual({ nombre: 'WA' })
  })
})

describe('el tope y los activos', () => {
  it('llega al tope cuando la lista lo alcanza', () => {
    expect(alTopeDeTiposDeSeguimiento(TIPOS, 3)).toBe(true)
    expect(alTopeDeTiposDeSeguimiento(TIPOS, 4)).toBe(false)
  })

  it('«sin tipos activos» es la lista sin ninguno encendido (cualquiera se puede apagar)', () => {
    expect(sinTiposActivos(TIPOS)).toBe(false)
    expect(sinTiposActivos(TIPOS.map((t) => ({ ...t, activo: false })))).toBe(true)
    expect(sinTiposActivos([])).toBe(true)
  })
})

describe('eliminar', () => {
  it('con seguimientos no se elimina, y dice por qué', () => {
    expect(motivoParaNoEliminar(tipo(A, 'Llamada', { conSeguimientos: true }))).toBe(
      '«Llamada» ya tiene seguimientos: no se elimina. Desactívalo para que no se ofrezca a los nuevos.',
    )
    expect(motivoParaNoEliminar(tipo(A, 'Llamada'))).toBeNull()
  })

  it('una URL con un tipo que no está o que ya tiene seguimientos no abre', () => {
    const con = [tipo(A, 'Llamada', { conSeguimientos: true }), tipo(B, 'Visita')]
    expect(motivoParaNoEliminarPorUrl(con, A)).toContain('ya tiene seguimientos')
    expect(motivoParaNoEliminarPorUrl(con, B)).toBeNull()
    expect(motivoParaNoEliminarPorUrl(con, C)).toBe('Ese tipo de seguimiento ya no existe.')
    expect(motivoParaNoEliminarPorUrl(con, null)).toBe('Ese tipo de seguimiento ya no existe.')
  })
})

describe('ordenar', () => {
  it('subir lo pone después del que estaba dos lugares antes, o primero', () => {
    expect(destinoDeTipoDeSeguimiento(TIPOS, C, 'subir')).toEqual({ despuesDe: A })
    expect(destinoDeTipoDeSeguimiento(TIPOS, B, 'subir')).toEqual({ despuesDe: null })
    expect(destinoDeTipoDeSeguimiento(TIPOS, A, 'subir')).toBeNull()
  })

  it('bajar lo pone después del siguiente; el último no baja', () => {
    expect(destinoDeTipoDeSeguimiento(TIPOS, A, 'bajar')).toEqual({ despuesDe: B })
    expect(destinoDeTipoDeSeguimiento(TIPOS, C, 'bajar')).toBeNull()
  })

  it('un id que no está no se mueve', () => {
    expect(destinoDeTipoDeSeguimiento(TIPOS, 'x', 'subir')).toBeNull()
  })

  it('anuncia el lugar para el lector de pantalla', () => {
    expect(textoDelLugarDeTipoDeSeguimiento(TIPOS, B)).toBe('«Llamada» quedó en el lugar 2 de 3.')
    expect(textoDelLugarDeTipoDeSeguimiento(TIPOS, 'x')).toBe('')
  })
})

describe('la URL del modal', () => {
  const lista = { tope: 3, tipos: TIPOS }

  it('«Nuevo» no abre en el tope y lo dice', () => {
    expect(motivoParaNoAbrirTipoDeSeguimiento(lista, 'nuevo', null)).toContain('máximo de 3')
    expect(motivoParaNoAbrirTipoDeSeguimiento({ ...lista, tope: 4 }, 'nuevo', null)).toBeNull()
  })

  it('«Editar» abre el que está y no el que no está', () => {
    expect(motivoParaNoAbrirTipoDeSeguimiento(lista, 'editar', A)).toBeNull()
    expect(motivoParaNoAbrirTipoDeSeguimiento(lista, 'editar', 'x')).toBe(
      'Ese tipo de seguimiento ya no existe.',
    )
    expect(motivoDeUrlDeTipoDeSeguimiento(TIPOS, null)).toBe(
      'Ese tipo de seguimiento ya no existe.',
    )
    expect(motivoParaNoAbrirTipoDeSeguimiento(lista, null, null)).toBeNull()
  })

  it('busca por id', () => {
    expect(tipoDeSeguimientoPorId(TIPOS, B)?.nombre).toBe('Llamada')
    expect(tipoDeSeguimientoPorId(TIPOS, null)).toBeNull()
  })
})

describe('firmaDeTiposDeSeguimiento', () => {
  it('cambia con la versión, el orden, el estado, el uso y el icono', () => {
    const base = { tope: 100, tipos: TIPOS }
    const firma = firmaDeTiposDeSeguimiento(base)
    const con = (cambio: Partial<TipoDeSeguimientoConUso>) =>
      firmaDeTiposDeSeguimiento({
        tope: 100,
        tipos: [{ ...TIPOS[0]!, ...cambio }, TIPOS[1]!, TIPOS[2]!],
      })
    expect(con({})).toBe(firma)
    expect(con({ actualizadoEn: 'otra' })).not.toBe(firma)
    expect(con({ orden: 99 })).not.toBe(firma)
    expect(con({ activo: false })).not.toBe(firma)
    expect(con({ conSeguimientos: true })).not.toBe(firma)
    expect(con({ icono: 'casa' })).not.toBe(firma)
    expect(firmaDeTiposDeSeguimiento({ tope: 50, tipos: TIPOS })).not.toBe(firma)
  })
})
