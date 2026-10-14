import { describe, expect, it } from 'vitest'
import {
  conCambio,
  conTelefonoRevisado,
  conTelefonoFrenado,
  frenadoPorElTelefono,
  limpio,
  trasDuplicado,
  trasRechazo,
  trasValidacion,
} from './estado-del-alta'

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const EXISTE = { estado: 'existe', leadId: ID, numero: 12, nombre: 'Ana', esMio: true } as const

describe('estado del alta', () => {
  const inicio = { ...limpio(ID, { nombre: '' }), paso: 'seguimiento' as const }

  it('cambiar un dato resuelve su error y limpia el aviso', () => {
    const con = { ...inicio, errores: { nombre: 'x', otro: 'y' }, aviso: 'algo' }
    const despues = conCambio(con, 'nombre', 'Ana')
    expect(despues.valores['nombre']).toBe('Ana')
    expect(despues.errores).toEqual({ otro: 'y' })
    expect(despues.aviso).toBeNull()
  })

  it('un error de un dato del lead lleva a los datos; uno del seguimiento no', () => {
    expect(trasValidacion(inicio, { nombre: 'x' }).paso).toBe('datos')
    expect(trasValidacion(inicio, { 'seguimiento.titulo': 'x' }).paso).toBe('seguimiento')
    expect(trasValidacion(inicio, { 'atributos.signo': 'x' }).paso).toBe('datos')
  })

  it('un rechazo con campo no repite el mensaje arriba; sin campo sí', () => {
    const error = { codigo: 'regla', mensaje: 'No se puede.' } as const
    expect(trasRechazo(inicio, error, { nombre: 'Escribe el nombre.' }).aviso).toBeNull()
    expect(trasRechazo(inicio, error).aviso).toBe('No se puede.')
    expect(trasRechazo({ ...inicio, pendiente: true }, error).pendiente).toBe(false)
  })

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
    const con = (telefono: string) => limpio(ID, { telefono_principal: telefono })
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
