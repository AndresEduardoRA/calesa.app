import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MENSAJE_CONFLICTO,
  MENSAJE_INESPERADO,
  MENSAJE_SIN_CONEXION,
  MENSAJE_SIN_RESPUESTA,
  conflicto,
  datosO,
  errorDePostgrest,
  fallo,
  ok,
} from './errores'

describe('ok / fallo', () => {
  it('envuelven el resultado como valor', () => {
    expect(ok(3)).toEqual({ ok: true, data: 3 })
    expect(fallo('regla', 'No se puede.')).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'No se puede.' },
    })
  })
})

describe('datosO', () => {
  it('entrega el dato de una lectura que salió bien', () => {
    expect(datosO(ok([1, 2]))).toEqual([1, 2])
  })

  it('lanza con el mensaje legible, para el error.tsx de la ruta', () => {
    expect(() => datosO(fallo('inesperado', 'No se pudo leer.'))).toThrow('No se pudo leer.')
  })
})

describe('conflicto', () => {
  it('usa el mensaje de la RPC y cae al genérico si no hay', () => {
    expect(conflicto('Rosa lo movió hace 1 min.')).toEqual({
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Rosa lo movió hace 1 min.' },
    })
    expect(conflicto()).toEqual({
      ok: false,
      error: { codigo: 'conflicto', mensaje: MENSAJE_CONFLICTO },
    })
  })
})

describe('errorDePostgrest', () => {
  it('traduce PT409 a conflicto y conserva el mensaje de la RPC', () => {
    expect(errorDePostgrest({ code: 'PT409', message: 'Rosa lo movió hace 1 min.' })).toEqual({
      codigo: 'conflicto',
      mensaje: 'Rosa lo movió hace 1 min.',
    })
  })

  it('traduce 42501 a sin_permiso con el motivo que escribió la RPC', () => {
    const error = errorDePostgrest({ code: '42501', message: 'No puedes bloquearte a ti mismo.' })
    expect(error).toEqual({ codigo: 'sin_permiso', mensaje: 'No puedes bloquearte a ti mismo.' })
  })

  it('no muestra el texto técnico de una violación de constraint', () => {
    const error = errorDePostgrest({
      code: '23505',
      message: 'duplicate key value violates unique constraint "roles_clave_key"',
    })
    expect(error).toEqual({ codigo: 'duplicado', mensaje: 'Ya existe un registro con esos datos.' })
  })

  it('usa el mensaje de la RPC cuando un 23503 viene escrito para la persona', () => {
    const error = errorDePostgrest({
      code: '23503',
      message: '2 personas tienen este rol: quítaselo antes de eliminarlo.',
    })
    expect(error.codigo).toBe('regla')
    expect(error.mensaje).toBe('2 personas tienen este rol: quítaselo antes de eliminarlo.')
  })

  it('cae al genérico si el mensaje llega vacío', () => {
    expect(errorDePostgrest({ code: 'PT409', message: '  ' }).mensaje).toBe(MENSAJE_CONFLICTO)
  })

  it('un dato inválido o un requerido que falta es una regla, con el motivo de la base', () => {
    expect(
      errorDePostgrest({ code: '22023', message: '«Cilindros» tiene que ser un número.' }),
    ).toEqual({
      codigo: 'regla',
      mensaje: '«Cilindros» tiene que ser un número.',
    })
    expect(errorDePostgrest({ code: '23502', message: 'Falta «Condición».' })).toEqual({
      codigo: 'regla',
      mensaje: 'Falta «Condición».',
    })
    expect(
      errorDePostgrest({ code: '23502', message: 'null value in column "titulo" of relation' })
        .mensaje,
    ).toBe('Falta un dato requerido.')
  })

  it('un código desconocido o ausente es inesperado y no filtra detalles', () => {
    expect(errorDePostgrest({ code: 'XX000', message: 'internal error at 0x1f' })).toEqual({
      codigo: 'inesperado',
      mensaje: MENSAJE_INESPERADO,
    })
    expect(errorDePostgrest({ code: 'XX000', message: 'Failed to fetch' }).mensaje).toBe(
      MENSAJE_INESPERADO,
    )
  })
})

describe('errorDePostgrest: el pedido que no llegó', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Lo que devuelve supabase-js cuando el `fetch` falla: sin código y con el texto del navegador.
  const SIN_CODIGO = [
    'TypeError: Failed to fetch',
    'NetworkError when attempting to fetch resource.',
    'Load failed',
    'TypeError: fetch failed',
  ]

  it.each(SIN_CODIGO)(
    '«%s» con red dice que no llegó al servidor, no «de nuestro lado»',
    (texto) => {
      vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true)
      expect(errorDePostgrest({ code: '', message: texto })).toEqual({
        codigo: 'inesperado',
        mensaje: MENSAJE_SIN_RESPUESTA,
      })
    },
  )

  it('sin conexión lo dice así', () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false)
    expect(errorDePostgrest({ message: 'TypeError: Failed to fetch' }).mensaje).toBe(
      MENSAJE_SIN_CONEXION,
    )
  })

  it('un error sin código que no es del transporte sigue siendo inesperado', () => {
    expect(errorDePostgrest({ code: '', message: 'algo raro' }).mensaje).toBe(MENSAJE_INESPERADO)
  })
})
