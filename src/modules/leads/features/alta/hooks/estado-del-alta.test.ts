import { describe, expect, it } from 'vitest'
import { CLAVE_DEL_ALTA } from '../../../entities/alta'
import { valoresDeSeguimientoNuevo } from '../../../entities/seguimiento-nuevo'
import {
  conBorradorRepuesto,
  conCambio,
  conSeguimientoCambiado,
  conTelefonoRevisado,
  conTelefonoFrenado,
  frenadoPorElTelefono,
  limpio,
  repartirMotivos,
  sinElOrigen,
  trasDuplicado,
  trasRechazo,
  trasSeguimientoInvalido,
  trasValidacion,
} from './estado-del-alta'

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const SEGUIMIENTO = valoresDeSeguimientoNuevo([{ id: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f' }])
const EXISTE = { estado: 'existe', leadId: ID, numero: 12, nombre: 'Ana', esMio: true } as const

describe('estado del alta', () => {
  const inicio = { ...limpio(ID, { nombre: '' }, SEGUIMIENTO), paso: 'seguimiento' as const }

  it('cambiar un dato resuelve su error y limpia el aviso', () => {
    const con = { ...inicio, errores: { nombre: 'x', otro: 'y' }, aviso: 'algo' }
    const despues = conCambio(con, 'nombre', 'Ana')
    expect(despues.valores['nombre']).toBe('Ana')
    expect(despues.errores).toEqual({ otro: 'y' })
    expect(despues.aviso).toBeNull()
  })

  it('un error de un dato del lead lleva a los datos', () => {
    expect(trasValidacion(inicio, { nombre: 'x' }).paso).toBe('datos')
    expect(trasValidacion(inicio, { 'atributos.signo': 'x' }).paso).toBe('datos')
  })

  it('el primer seguimiento que no pasa lleva a su paso, con sus motivos junto a cada campo', () => {
    const volvio = trasSeguimientoInvalido(
      { ...inicio, paso: 'datos', errores: { nombre: 'x' } },
      { titulo: 'Escribe un resumen del seguimiento.' },
    )
    expect(volvio).toMatchObject({
      paso: 'seguimiento',
      errores: {},
      erroresDelSeguimiento: { titulo: 'Escribe un resumen del seguimiento.' },
    })
  })

  it('escribir en un campo del seguimiento resuelve su motivo y no los de otros', () => {
    const con = {
      ...inicio,
      erroresDelSeguimiento: { titulo: 'x', detalle: 'y' },
      aviso: 'algo',
    }
    const despues = conSeguimientoCambiado(con, 'titulo', 'Llamó')
    expect(despues.seguimiento.titulo).toBe('Llamó')
    expect(despues.erroresDelSeguimiento).toEqual({ detalle: 'y' })
    expect(despues.aviso).toBeNull()
  })

  it('la base dice los motivos con la clave del alta: los del seguimiento se reparten aparte', () => {
    expect(
      repartirMotivos({
        'seguimiento.titulo': 'a',
        'seguimiento.detalle': 'b',
        'seguimiento.ocurrido_en': 'c',
        'seguimiento.tipo_id': 'd',
        'recordatorio.recordar_en': 'e',
        'atributos.signo': 'f',
        nombre: 'g',
      }),
    ).toEqual({
      lead: { 'atributos.signo': 'f', nombre: 'g' },
      seguimiento: { titulo: 'a', detalle: 'b', ocurridoEn: 'c', tipoId: 'd', recordatorio: 'e' },
    })
  })

  it('un rechazo de la base sólo por el seguimiento vuelve a su paso', () => {
    const error = { codigo: 'regla', mensaje: 'x' } as const
    const r = trasRechazo({ ...inicio, paso: 'datos' }, error, {
      'seguimiento.detalle': 'El detalle admite hasta 5000 caracteres.',
    })
    expect(r).toMatchObject({
      paso: 'seguimiento',
      aviso: null,
      erroresDelSeguimiento: { detalle: 'El detalle admite hasta 5000 caracteres.' },
    })
    expect(trasRechazo({ ...inicio, paso: 'seguimiento' }, error, { nombre: 'x' }).paso).toBe(
      'datos',
    )
  })

  it('un borrador repuesto mezcla los datos y reemplaza el seguimiento sin tocar lo demás', () => {
    const escrito = { ...SEGUIMIENTO, titulo: 'Llamó' }
    const r = conBorradorRepuesto(inicio, { nombre: 'Ana' }, escrito)
    expect(r.valores['nombre']).toBe('Ana')
    expect(r.seguimiento.titulo).toBe('Llamó')
    expect(conBorradorRepuesto(inicio, {}, null).seguimiento).toBe(inicio.seguimiento)
  })

  it('un rechazo con campo no repite el mensaje arriba; sin campo sí', () => {
    const error = { codigo: 'regla', mensaje: 'No se puede.' } as const
    expect(trasRechazo(inicio, error, { nombre: 'Escribe el nombre.' }).aviso).toBeNull()
    expect(trasRechazo(inicio, error).aviso).toBe('No se puede.')
    expect(trasRechazo({ ...inicio, pendiente: true }, error).pendiente).toBe(false)
  })
})

describe('estado del alta: el teléfono', () => {
  const inicio = { ...limpio(ID, { nombre: '' }, SEGUIMIENTO), paso: 'seguimiento' as const }

  it('un teléfono con dueño frena; uno sin dueño frena hasta tomarlo', () => {
    expect(frenadoPorElTelefono(null, false)).toBeNull()
    expect(frenadoPorElTelefono({ estado: 'libre' }, false)).toBeNull()
    expect(frenadoPorElTelefono(EXISTE, false)).toContain('Ya existe: Ana (#12)')
    expect(frenadoPorElTelefono({ estado: 'de_otro', dueno: 'Diego' }, false)).toContain(
      'Lo tiene Diego',
    )
    expect(frenadoPorElTelefono({ estado: 'limbo' }, false)).toContain('toma el lead')
    expect(frenadoPorElTelefono({ estado: 'limbo' }, true)).toBeNull()
  })

  it('frenar o un duplicado devuelven a los datos con el motivo en el teléfono', () => {
    const frenado = conTelefonoFrenado(inicio, 'No.')
    expect(frenado).toMatchObject({ paso: 'datos', errores: { telefono_principal: 'No.' } })
    const duplicado = trasDuplicado({ ...inicio, adoptar: true, pendiente: true }, EXISTE)
    expect(duplicado).toMatchObject({ paso: 'datos', adoptar: false, pendiente: false })
    expect(duplicado.errores['telefono_principal']).toBe(
      'Ya existe: Ana (#12), y es tuyo. No se creó nada.',
    )
    expect(trasDuplicado(inicio, { estado: 'limbo' }).errores['telefono_principal']).toContain(
      'sin dueño',
    )
  })

  it('al salir del campo se dice si lo escrito no es un teléfono, y vacío no se marca', () => {
    const con = (telefono: string) => limpio(ID, { telefono_principal: telefono }, SEGUIMIENTO)
    expect(conTelefonoRevisado(con('70abc'), '+591').errores['telefono_principal']).toContain(
      'sólo lleva números',
    )
    expect(conTelefonoRevisado(con('70011002'), '+591').errores).toEqual({})
    expect(conTelefonoRevisado(con('  '), '+591').errores).toEqual({})
    expect(conTelefonoRevisado(con('70011002'), null).errores['telefono_principal']).toContain(
      '«+»',
    )
  })
})

describe('estado del alta: el origen que se apagó', () => {
  it('deja el origen sin elegir y no toca lo demás', () => {
    const antes = limpio(ID, { nombre: 'Ana', [CLAVE_DEL_ALTA.origen]: 'o1' }, SEGUIMIENTO)
    const despues = sinElOrigen(antes)
    expect(despues.valores[CLAVE_DEL_ALTA.origen]).toBe('')
    expect(despues.valores['nombre']).toBe('Ana')
    expect(despues.id).toBe(ID)
  })
})
