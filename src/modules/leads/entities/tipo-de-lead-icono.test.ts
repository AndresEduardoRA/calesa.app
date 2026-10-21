import { describe, expect, it } from 'vitest'
import {
  cambiosDeTipo,
  decidirEnvioDeTipo,
  hayCambiosEnTipo,
  type TipoDeLeadConUso,
} from './tipo-de-lead'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const tipo = (n: number, extra: Partial<TipoDeLeadConUso> = {}): TipoDeLeadConUso => ({
  id: id(n),
  clave: `t${n}`,
  nombre: `Tipo ${n}`,
  clase: n % 2 === 1 ? 'prospecto' : 'cliente',
  icono: null,
  activo: true,
  orden: n * 10,
  actualizadoEn: `2026-10-16T12:00:0${n}.123456+00:00`,
  conLeads: false,
  ...extra,
})
// Dos de cada clase.
const tipos = [tipo(1), tipo(2), tipo(3), tipo(4)]

describe('el icono y el envío del modal', () => {
  const con = tipo(1, { icono: 'persona' })

  it('al editar sólo viaja lo que cambió; un icono que ya no se conoce, sin tocar, no viaja', () => {
    expect(cambiosDeTipo(con, 'Tipo 1', 'persona')).toEqual({})
    expect(cambiosDeTipo(con, 'Nuevo', 'persona')).toEqual({ nombre: 'Nuevo' })
    expect(cambiosDeTipo(con, 'Tipo 1', 'casa')).toEqual({ icono: 'casa' })
    expect(cambiosDeTipo(con, 'Tipo 1', null)).toEqual({ icono: null })
    expect(cambiosDeTipo(tipo(1, { icono: 'phone' }), 'Otro', 'phone')).toEqual({ nombre: 'Otro' })
  })

  it('decide qué hace el modal: rechaza, cierra sin cambios, crea o guarda sólo lo que cambió', () => {
    const base = { tipos, icono: null as string | null }
    expect(
      decidirEnvioDeTipo({ ...base, texto: '  ', clase: 'cliente', original: null }),
    ).toMatchObject({
      paso: 'invalido',
      motivos: { nombre: 'Escribe el nombre del tipo.' },
    })
    expect(
      decidirEnvioDeTipo({ ...base, texto: 'Nuevo', clase: null, original: null }),
    ).toMatchObject({
      paso: 'invalido',
      motivos: { clase: 'Elige la clase del tipo: prospecto o cliente.' },
    })
    expect(
      decidirEnvioDeTipo({ ...base, texto: ' Nuevo ', clase: 'cliente', original: null }),
    ).toEqual({
      paso: 'crear',
      nombre: 'Nuevo',
      clase: 'cliente',
    })
    expect(
      decidirEnvioDeTipo({
        ...base,
        texto: 'Tipo 1',
        clase: 'prospecto',
        icono: 'persona',
        original: con,
      }),
    ).toEqual({
      paso: 'nada',
    })
    expect(
      decidirEnvioDeTipo({
        ...base,
        texto: 'Tipo 1',
        clase: 'prospecto',
        icono: 'casa',
        original: con,
      }),
    ).toEqual({
      paso: 'guardar',
      cambios: { icono: 'casa' },
    })
    // Editar conserva la clase del tipo aunque el formulario traiga otra.
    expect(
      decidirEnvioDeTipo({
        ...base,
        texto: 'Otro',
        clase: 'cliente',
        icono: 'persona',
        original: con,
      }),
    ).toEqual({
      paso: 'guardar',
      cambios: { nombre: 'Otro' },
    })
  })

  it('hay cambios con algo escrito, un icono elegido o (al crear) una clase elegida', () => {
    expect(hayCambiosEnTipo('', null, null, null)).toBe(false)
    expect(hayCambiosEnTipo('x', null, null, null)).toBe(true)
    expect(hayCambiosEnTipo('', 'cliente', null, null)).toBe(true)
    expect(hayCambiosEnTipo('', null, 'casa', null)).toBe(true)
    expect(hayCambiosEnTipo('Tipo 1', 'prospecto', 'persona', con)).toBe(false)
    expect(hayCambiosEnTipo('Tipo 1', 'prospecto', 'casa', con)).toBe(true)
    expect(hayCambiosEnTipo(' Tipo   1 ', 'prospecto', 'persona', con)).toBe(false)
  })
})
