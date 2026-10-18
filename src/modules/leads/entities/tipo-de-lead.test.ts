import { describe, expect, it } from 'vitest'
import {
  alTopeDeTipos,
  destinoDeTipo,
  esElUnicoActivoDeSuClase,
  firmaDeTipos,
  listaDeTiposDesde,
  motivoDeUrlDeTipo,
  motivoParaNoAbrir,
  motivoParaNoDesactivar,
  motivoParaNoEliminar,
  motivoParaNoEliminarPorUrl,
  normalizarNombreDeTipo,
  respuestaDeTiposDesde,
  textoDelLugar,
  textoDelTope,
  tipoPorId,
  validarNombreDeTipo,
  validarTipo,
  type ListaDeTipos,
  type TipoDeLeadConUso,
} from './tipo-de-lead'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const tipo = (n: number, extra: Partial<TipoDeLeadConUso> = {}): TipoDeLeadConUso => ({
  id: id(n),
  clave: `t${n}`,
  nombre: `Tipo ${n}`,
  clase: n % 2 === 1 ? 'prospecto' : 'cliente',
  activo: true,
  orden: n * 10,
  actualizadoEn: `2026-10-16T12:00:0${n}.123456+00:00`,
  conLeads: false,
  ...extra,
})
// Dos de cada clase.
const tipos = [tipo(1), tipo(2), tipo(3), tipo(4)]
const lista = (extra: TipoDeLeadConUso[] = tipos, tope = 100): ListaDeTipos => ({
  tope,
  tipos: extra,
})

const filas = [
  {
    id: id(1),
    clave: 'prospecto',
    nombre: 'Prospecto',
    clase: 'prospecto',
    activo: true,
    orden: 10,
    actualizado_en: '2026-10-16T12:00:00.123456+00:00',
    con_leads: true,
  },
]

describe('listaDeTiposDesde', () => {
  it('lee las filas de la base con sus versiones, su clase y el tope', () => {
    expect(listaDeTiposDesde({ tope: 100, tipos: filas })).toEqual({
      tope: 100,
      tipos: [
        {
          id: id(1),
          clave: 'prospecto',
          nombre: 'Prospecto',
          clase: 'prospecto',
          activo: true,
          orden: 10,
          actualizadoEn: '2026-10-16T12:00:00.123456+00:00',
          conLeads: true,
        },
      ],
    })
  })

  it('una forma rota es nula, no una lista a medias', () => {
    expect(listaDeTiposDesde({ tope: 100, tipos: [{ id: 'x' }] })).toBeNull()
    expect(
      listaDeTiposDesde({ tope: 100, tipos: [{ ...filas[0], clase: 'proveedor' }] }),
    ).toBeNull()
    expect(listaDeTiposDesde({ tipos: filas })).toBeNull()
    expect(listaDeTiposDesde(null)).toBeNull()
  })
})

describe('respuestaDeTiposDesde', () => {
  const cruda = { tope: 100, tipos: filas }

  it('trae el tipo y la lista; repetir y «sin cambios» son lo mismo', () => {
    expect(respuestaDeTiposDesde({ id: id(1), repetido: true, lista: cruda })?.repetido).toBe(true)
    expect(respuestaDeTiposDesde({ id: id(1), sin_cambios: true, lista: cruda })?.repetido).toBe(
      true,
    )
    expect(respuestaDeTiposDesde({ lista: cruda })).toMatchObject({ id: null, repetido: false })
  })

  it('una lista rota hace nula la respuesta', () => {
    expect(respuestaDeTiposDesde({ lista: { tope: 100, tipos: [{}] } })).toBeNull()
    expect(respuestaDeTiposDesde('x')).toBeNull()
  })
})

describe('validarNombreDeTipo', () => {
  it('junta los espacios y recorta', () => {
    expect(normalizarNombreDeTipo('  Cliente   VIP ')).toBe('Cliente VIP')
    expect(validarNombreDeTipo('  Cliente   VIP ', tipos, null)).toEqual({
      ok: true,
      nombre: 'Cliente VIP',
    })
  })

  it('rechaza vacío, en blanco y largo', () => {
    expect(validarNombreDeTipo('   ', tipos, null)).toEqual({
      ok: false,
      motivo: 'Escribe el nombre del tipo.',
    })
    expect(validarNombreDeTipo('x'.repeat(41), tipos, null)).toMatchObject({
      ok: false,
      motivo: 'El nombre del tipo admite hasta 40 caracteres.',
    })
    expect(validarNombreDeTipo('x'.repeat(40), tipos, null).ok).toBe(true)
  })

  it('el repetido no distingue mayúsculas ni espacios, salvo consigo mismo', () => {
    expect(validarNombreDeTipo('  tipo   2 ', tipos, null)).toEqual({
      ok: false,
      motivo: 'Ya hay un tipo «tipo 2».',
    })
    expect(validarNombreDeTipo('TIPO 2', tipos, id(2)).ok).toBe(true)
    expect(validarNombreDeTipo('Tipo 3', tipos, id(2)).ok).toBe(false)
  })
})

describe('el último activo de su clase', () => {
  it('con otro activo de la misma clase, se puede apagar y eliminar', () => {
    expect(esElUnicoActivoDeSuClase(tipos, tipo(1))).toBe(false)
    expect(motivoParaNoDesactivar(tipos, tipo(1))).toBeNull()
    expect(motivoParaNoEliminar(tipos, tipo(1))).toBeNull()
  })

  it('el único activo de su clase no se apaga, y lo dice con el texto de la base', () => {
    const uno = [tipo(1), tipo(2), tipo(3, { activo: false }), tipo(4)]
    expect(esElUnicoActivoDeSuClase(uno, uno[0] as TipoDeLeadConUso)).toBe(true)
    expect(motivoParaNoDesactivar(uno, uno[0] as TipoDeLeadConUso)).toBe(
      'Es el único tipo activo de la clase «prospecto»: activa o crea otro antes.',
    )
    expect(motivoParaNoDesactivar(uno, uno[1] as TipoDeLeadConUso)).toBeNull()
  })

  it('uno apagado nunca es «el único activo»: se puede volver a encender', () => {
    const apagado = tipo(3, { activo: false })
    expect(esElUnicoActivoDeSuClase([tipo(1), apagado], apagado)).toBe(false)
    expect(motivoParaNoDesactivar([tipo(1), apagado], apagado)).toBeNull()
  })

  it('el único activo de su clase, sin leads, tampoco se elimina', () => {
    const uno = [tipo(1), tipo(3, { activo: false })]
    expect(motivoParaNoEliminar(uno, tipo(1))).toBe(
      '«Tipo 1» es el único tipo activo de la clase «prospecto»: no se elimina. Activa o crea otro antes.',
    )
  })
})

describe('destinoDeTipo', () => {
  it('subir un lugar es ir después del antepenúltimo; al primero, antes de todos', () => {
    expect(destinoDeTipo(tipos, id(3), 'subir')).toEqual({ despuesDe: id(1) })
    expect(destinoDeTipo(tipos, id(2), 'subir')).toEqual({ despuesDe: null })
  })

  it('bajar un lugar es ir después del que sigue', () => {
    expect(destinoDeTipo(tipos, id(1), 'bajar')).toEqual({ despuesDe: id(2) })
    expect(destinoDeTipo(tipos, id(3), 'bajar')).toEqual({ despuesDe: id(4) })
  })

  it('en los extremos, o si no está, no hay a dónde', () => {
    expect(destinoDeTipo(tipos, id(1), 'subir')).toBeNull()
    expect(destinoDeTipo(tipos, id(4), 'bajar')).toBeNull()
    expect(destinoDeTipo(tipos, id(9), 'subir')).toBeNull()
  })
})

describe('textos y estados', () => {
  it('dice el lugar en que quedó', () => {
    expect(textoDelLugar(tipos, id(3))).toBe('«Tipo 3» quedó en el lugar 3 de 4.')
    expect(textoDelLugar(tipos, id(9))).toBe('')
  })

  it('el tope lo dice la base: se llega con tantos, activos o no, y el texto lo nombra', () => {
    expect(alTopeDeTipos(tipos, 100)).toBe(false)
    expect(alTopeDeTipos(tipos, 4)).toBe(true)
    expect(textoDelTope(100)).toBe(
      'Llegaste al máximo de 100 tipos. Elimina uno sin leads o desactiva los que no uses.',
    )
  })

  it('con leads no se elimina, y dice por qué (antes que lo de la clase)', () => {
    expect(motivoParaNoEliminar(tipos, tipo(1, { conLeads: true }))).toBe(
      '«Tipo 1» ya tiene leads: no se elimina. Desactívalo para que no se ofrezca a los nuevos.',
    )
  })

  it('la URL de eliminar abre un tipo sin leads, y no uno que no está o que ya tiene leads', () => {
    expect(motivoParaNoEliminarPorUrl(tipos, id(2))).toBeNull()
    expect(motivoParaNoEliminarPorUrl(tipos, id(99))).toBe('Ese tipo ya no existe.')
    expect(motivoParaNoEliminarPorUrl(tipos, null)).toBe('Ese tipo ya no existe.')
    expect(motivoParaNoEliminarPorUrl([tipo(1, { conLeads: true }), tipo(3)], id(1))).toBe(
      '«Tipo 1» ya tiene leads: no se elimina. Desactívalo para que no se ofrezca a los nuevos.',
    )
  })

  it('una URL que nombra un tipo que no está no abre', () => {
    expect(motivoDeUrlDeTipo(tipos, id(2))).toBeNull()
    expect(motivoDeUrlDeTipo(tipos, id(9))).toBe('Ese tipo ya no existe.')
    expect(motivoDeUrlDeTipo(tipos, null)).toBe('Ese tipo ya no existe.')
    expect(tipoPorId(tipos, id(2))?.nombre).toBe('Tipo 2')
    expect(tipoPorId(tipos, null)).toBeNull()
  })

  it('la firma cambia con la versión, el lugar, el estado, el uso o el tope', () => {
    const base = firmaDeTipos(lista())
    expect(firmaDeTipos(lista())).toBe(base)
    expect(firmaDeTipos(lista([tipo(1, { orden: 5 }), ...tipos.slice(1)]))).not.toBe(base)
    expect(firmaDeTipos(lista([tipo(1, { activo: false }), ...tipos.slice(1)]))).not.toBe(base)
    expect(firmaDeTipos(lista([tipo(1, { conLeads: true }), ...tipos.slice(1)]))).not.toBe(base)
    expect(firmaDeTipos(lista([tipo(1, { actualizadoEn: 'otra' }), ...tipos.slice(1)]))).not.toBe(
      base,
    )
    expect(firmaDeTipos(lista(tipos, 50))).not.toBe(base)
  })
})

describe('motivoParaNoAbrir', () => {
  it('«nuevo» abre salvo en el tope', () => {
    expect(motivoParaNoAbrir(lista(), 'nuevo', null)).toBeNull()
    expect(motivoParaNoAbrir(lista(tipos, 4), 'nuevo', null)).toBe(textoDelTope(4))
  })

  it('«editar» abre si el tipo está; sin id o inexistente, no', () => {
    expect(motivoParaNoAbrir(lista(), 'editar', id(2))).toBeNull()
    expect(motivoParaNoAbrir(lista(), 'editar', id(9))).toBe('Ese tipo ya no existe.')
    expect(motivoParaNoAbrir(lista(), 'editar', null)).toBe('Ese tipo ya no existe.')
  })

  it('sin modal no hay nada que revisar', () => {
    expect(motivoParaNoAbrir(lista(), null, null)).toBeNull()
  })
})

describe('validarTipo', () => {
  it('al crear pide el nombre y la clase, cada uno con su motivo', () => {
    expect(validarTipo('', null, tipos, null)).toEqual({
      ok: false,
      motivos: {
        nombre: 'Escribe el nombre del tipo.',
        clase: 'Elige la clase del tipo: prospecto o cliente.',
      },
    })
    expect(validarTipo('Mayorista', null, tipos, null)).toEqual({
      ok: false,
      motivos: { clase: 'Elige la clase del tipo: prospecto o cliente.' },
    })
    expect(validarTipo('Tipo 2', 'cliente', tipos, null)).toEqual({
      ok: false,
      motivos: { nombre: 'Ya hay un tipo «Tipo 2».' },
    })
  })

  it('con nombre y clase, valida', () => {
    expect(validarTipo('  Mayorista ', 'cliente', tipos, null)).toEqual({
      ok: true,
      nombre: 'Mayorista',
      clase: 'cliente',
    })
  })

  it('al editar la clase es la del tipo, aunque no se elija nada, y su nombre no choca consigo mismo', () => {
    expect(validarTipo('TIPO 2', null, tipos, tipo(2))).toEqual({
      ok: true,
      nombre: 'TIPO 2',
      clase: 'cliente',
    })
    expect(validarTipo('Tipo 3', null, tipos, tipo(2))).toMatchObject({ ok: false })
  })
})
