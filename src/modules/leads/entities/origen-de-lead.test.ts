import { describe, expect, it } from 'vitest'
import {
  alTopeDeOrigenes,
  destinoDeOrigen,
  firmaDeOrigenes,
  listaDeOrigenesDesde,
  motivoDeUrlDeOrigen,
  motivoParaNoAbrir,
  motivoParaNoEliminar,
  motivoParaNoEliminarPorUrl,
  normalizarNombreDeOrigen,
  origenPorId,
  respuestaDeOrigenesDesde,
  sinOrigenesActivos,
  textoDelLugar,
  TEXTO_DEL_TOPE,
  TOPE_DE_ORIGENES_DE_LEAD,
  validarNombreDeOrigen,
  type OrigenDeLeadConUso,
} from './origen-de-lead'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const origen = (n: number, extra: Partial<OrigenDeLeadConUso> = {}): OrigenDeLeadConUso => ({
  id: id(n),
  clave: `o${n}`,
  nombre: `Origen ${n}`,
  activo: true,
  orden: n * 10,
  actualizadoEn: `2026-10-16T12:00:0${n}.123456+00:00`,
  conLeads: false,
  ...extra,
})
const lista = [origen(1), origen(2), origen(3), origen(4)]

describe('listaDeOrigenesDesde', () => {
  it('lee las filas de la base con sus versiones', () => {
    const leida = listaDeOrigenesDesde([
      {
        id: id(1),
        clave: 'web',
        nombre: 'Web',
        activo: true,
        orden: 10,
        actualizado_en: '2026-10-16T12:00:00.123456+00:00',
        con_leads: true,
      },
    ])
    expect(leida).toEqual([
      {
        id: id(1),
        clave: 'web',
        nombre: 'Web',
        activo: true,
        orden: 10,
        actualizadoEn: '2026-10-16T12:00:00.123456+00:00',
        conLeads: true,
      },
    ])
  })

  it('una forma rota es nula, no una lista a medias', () => {
    expect(listaDeOrigenesDesde([{ id: 'x' }])).toBeNull()
    expect(listaDeOrigenesDesde(null)).toBeNull()
  })
})

describe('respuestaDeOrigenesDesde', () => {
  const filas = [
    {
      id: id(1),
      clave: 'web',
      nombre: 'Web',
      activo: true,
      orden: 10,
      actualizado_en: '2026-10-16T12:00:00+00:00',
      con_leads: false,
    },
  ]

  it('trae el origen y la lista; repetir y «sin cambios» son lo mismo', () => {
    expect(respuestaDeOrigenesDesde({ id: id(1), repetido: true, origenes: filas })?.repetido).toBe(
      true,
    )
    expect(
      respuestaDeOrigenesDesde({ id: id(1), sin_cambios: true, origenes: filas })?.repetido,
    ).toBe(true)
    expect(respuestaDeOrigenesDesde({ origenes: filas })).toMatchObject({
      id: null,
      repetido: false,
    })
  })

  it('una lista rota hace nula la respuesta', () => {
    expect(respuestaDeOrigenesDesde({ origenes: [{}] })).toBeNull()
    expect(respuestaDeOrigenesDesde('x')).toBeNull()
  })
})

describe('validarNombreDeOrigen', () => {
  it('junta los espacios y recorta', () => {
    expect(normalizarNombreDeOrigen('  Redes   sociales ')).toBe('Redes sociales')
    expect(validarNombreDeOrigen('  Redes   sociales ', lista, null)).toEqual({
      ok: true,
      nombre: 'Redes sociales',
    })
  })

  it('rechaza vacío, en blanco y largo', () => {
    expect(validarNombreDeOrigen('', lista, null)).toMatchObject({ ok: false })
    expect(validarNombreDeOrigen('   ', lista, null)).toEqual({
      ok: false,
      motivo: 'Escribe el nombre del origen.',
    })
    expect(validarNombreDeOrigen('x'.repeat(41), lista, null)).toMatchObject({
      ok: false,
      motivo: 'El nombre del origen admite hasta 40 caracteres.',
    })
    expect(validarNombreDeOrigen('x'.repeat(40), lista, null).ok).toBe(true)
  })

  it('el repetido no distingue mayúsculas ni espacios, salvo consigo mismo', () => {
    expect(validarNombreDeOrigen('  origen   2 ', lista, null)).toEqual({
      ok: false,
      motivo: 'Ya hay un origen «origen 2».',
    })
    expect(validarNombreDeOrigen('ORIGEN 2', lista, id(2)).ok).toBe(true)
    expect(validarNombreDeOrigen('Origen 3', lista, id(2)).ok).toBe(false)
  })
})

describe('destinoDeOrigen', () => {
  it('subir un lugar es ir después del antepenúltimo; al primero, antes de todos', () => {
    expect(destinoDeOrigen(lista, id(3), 'subir')).toEqual({ despuesDe: id(1) })
    expect(destinoDeOrigen(lista, id(2), 'subir')).toEqual({ despuesDe: null })
  })

  it('bajar un lugar es ir después del que sigue', () => {
    expect(destinoDeOrigen(lista, id(1), 'bajar')).toEqual({ despuesDe: id(2) })
    expect(destinoDeOrigen(lista, id(3), 'bajar')).toEqual({ despuesDe: id(4) })
  })

  it('en los extremos, o si no está, no hay a dónde', () => {
    expect(destinoDeOrigen(lista, id(1), 'subir')).toBeNull()
    expect(destinoDeOrigen(lista, id(4), 'bajar')).toBeNull()
    expect(destinoDeOrigen(lista, id(9), 'subir')).toBeNull()
  })
})

describe('textos y estados', () => {
  it('dice el lugar en que quedó', () => {
    expect(textoDelLugar(lista, id(3))).toBe('«Origen 3» quedó en el lugar 3 de 4.')
    expect(textoDelLugar(lista, id(9))).toBe('')
  })

  it('el tope son 100, activos o no', () => {
    expect(alTopeDeOrigenes(lista)).toBe(false)
    const cien = Array.from({ length: TOPE_DE_ORIGENES_DE_LEAD }, (_, n) => origen(n + 1))
    expect(alTopeDeOrigenes(cien)).toBe(true)
  })

  it('con leads no se elimina, y dice por qué', () => {
    expect(motivoParaNoEliminar(origen(1))).toBeNull()
    expect(motivoParaNoEliminar(origen(1, { conLeads: true }))).toBe(
      '«Origen 1» ya tiene leads: no se elimina. Desactívalo para que no se ofrezca a los nuevos.',
    )
  })

  it('la URL de eliminar abre un origen sin leads, y no uno que no está o que ya tiene leads', () => {
    expect(motivoParaNoEliminarPorUrl(lista, id(2))).toBeNull()
    expect(motivoParaNoEliminarPorUrl(lista, id(99))).toBe('Ese origen ya no existe.')
    expect(motivoParaNoEliminarPorUrl(lista, null)).toBe('Ese origen ya no existe.')
    expect(motivoParaNoEliminarPorUrl([origen(1, { conLeads: true })], id(1))).toBe(
      '«Origen 1» ya tiene leads: no se elimina. Desactívalo para que no se ofrezca a los nuevos.',
    )
  })

  it('sin ninguno activo', () => {
    expect(sinOrigenesActivos(lista)).toBe(false)
    expect(sinOrigenesActivos([origen(1, { activo: false })])).toBe(true)
    expect(sinOrigenesActivos([])).toBe(true)
  })

  it('una URL que nombra un origen que no está no abre', () => {
    expect(motivoDeUrlDeOrigen(lista, id(2))).toBeNull()
    expect(motivoDeUrlDeOrigen(lista, id(9))).toBe('Ese origen ya no existe.')
    expect(motivoDeUrlDeOrigen(lista, null)).toBe('Ese origen ya no existe.')
    expect(origenPorId(lista, id(2))?.nombre).toBe('Origen 2')
    expect(origenPorId(lista, null)).toBeNull()
  })

  it('la firma cambia con la versión, el lugar, el estado o el uso', () => {
    const base = firmaDeOrigenes(lista)
    expect(firmaDeOrigenes(lista)).toBe(base)
    expect(firmaDeOrigenes([origen(1, { orden: 5 }), ...lista.slice(1)])).not.toBe(base)
    expect(firmaDeOrigenes([origen(1, { activo: false }), ...lista.slice(1)])).not.toBe(base)
    expect(firmaDeOrigenes([origen(1, { conLeads: true }), ...lista.slice(1)])).not.toBe(base)
    expect(firmaDeOrigenes([origen(1, { actualizadoEn: 'otra' }), ...lista.slice(1)])).not.toBe(
      base,
    )
  })
})

describe('motivoParaNoAbrir', () => {
  it('«nuevo» abre salvo en el tope', () => {
    expect(motivoParaNoAbrir(lista, 'nuevo', null)).toBeNull()
    const cien = Array.from({ length: TOPE_DE_ORIGENES_DE_LEAD }, (_, n) => origen(n + 1))
    expect(motivoParaNoAbrir(cien, 'nuevo', null)).toBe(TEXTO_DEL_TOPE)
  })

  it('«editar» abre si el origen está; sin id o inexistente, no', () => {
    expect(motivoParaNoAbrir(lista, 'editar', id(2))).toBeNull()
    expect(motivoParaNoAbrir(lista, 'editar', id(9))).toBe('Ese origen ya no existe.')
    expect(motivoParaNoAbrir(lista, 'editar', null)).toBe('Ese origen ya no existe.')
  })

  it('sin modal no hay nada que revisar', () => {
    expect(motivoParaNoAbrir(lista, null, null)).toBeNull()
  })
})
