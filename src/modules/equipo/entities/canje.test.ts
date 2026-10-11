import { describe, expect, it } from 'vitest'
import {
  destinoDeCuentaInactiva,
  destinoDeFallo,
  destinoTrasCanje,
  leerCanje,
  type PedidoDeCanje,
} from './canje'

function leer(query: string): PedidoDeCanje {
  return leerCanje(new URLSearchParams(query))
}

describe('leerCanje', () => {
  it('reconoce el código de Google', () => {
    expect(leer('code=abc&next=%2Fleads')).toEqual({ tipo: 'codigo', codigo: 'abc' })
  })

  it('reconoce el enlace de un correo', () => {
    expect(leer('token_hash=h4sh&type=recovery')).toEqual({
      tipo: 'enlace',
      tokenHash: 'h4sh',
      tipoEnlace: 'recovery',
    })
  })

  it('un enlace con un tipo que no existe no se canjea', () => {
    expect(leer('token_hash=h4sh&type=admin')).toEqual({ tipo: 'vacio' })
  })

  it('un error de Auth gana a todo lo demás', () => {
    expect(leer('error=access_denied&error_description=cancelado&code=abc')).toEqual({
      tipo: 'rechazo',
      error: 'access_denied',
      descripcion: 'cancelado',
    })
  })

  it('sin nada que canjear queda vacío', () => {
    expect(leer('')).toEqual({ tipo: 'vacio' })
  })
})

describe('destinoTrasCanje', () => {
  it('recuperación e invitación van a elegir la contraseña', () => {
    expect(destinoTrasCanje(leer('token_hash=x&type=recovery'), '/leads')).toBe(
      '/auth/nueva-contrasena',
    )
    expect(destinoTrasCanje(leer('token_hash=x&type=invite'), null)).toBe('/auth/nueva-contrasena')
  })

  it('Google y la confirmación van a donde iba la persona, si es una ruta interna', () => {
    expect(destinoTrasCanje(leer('code=abc'), '/vehiculos?origen=1')).toBe('/vehiculos?origen=1')
    expect(destinoTrasCanje(leer('code=abc'), '//malo.com')).toBe('/')
    expect(destinoTrasCanje(leer('token_hash=x&type=signup'), null)).toBe('/')
  })
})

describe('destinoDeFallo', () => {
  it('un enlace de recuperación vencido vuelve a pedir otro', () => {
    expect(destinoDeFallo(leer('token_hash=x&type=recovery'))).toBe(
      '/recuperar?aviso=enlace_vencido',
    )
  })

  it('una confirmación o una invitación vencida lo dicen en el ingreso', () => {
    expect(destinoDeFallo(leer('token_hash=x&type=signup'))).toBe(
      '/ingreso?aviso=confirmacion_vencida',
    )
    expect(destinoDeFallo(leer('token_hash=x&type=invite'))).toBe(
      '/ingreso?aviso=invitacion_vencida',
    )
  })

  it('cancelar en Google no es un error', () => {
    expect(destinoDeFallo(leer('error=access_denied'))).toBe('/ingreso?aviso=google_cancelado')
    // La base rechaza la cuenta nueva al cerrar la transacción: Auth vuelve sin decir por qué.
    expect(
      destinoDeFallo(leer('error=server_error&error_description=Unexpected+failure'), true),
    ).toBe('/ingreso?aviso=registro_cerrado')
    expect(destinoDeFallo(leer('error=server_error&error_description=Unexpected+failure'))).toBe(
      '/ingreso?aviso=google',
    )
    expect(destinoDeFallo(leer('error=access_denied'), true)).toBe(
      '/ingreso?aviso=google_cancelado',
    )
  })

  it('una cuenta nueva de Google con el registro cerrado lo explica', () => {
    expect(
      destinoDeFallo(leer('error=server_error&error_description=Database+error+saving+new+user')),
    ).toBe('/ingreso?aviso=registro_cerrado')
  })

  it('cualquier otra falla de Google da un error legible', () => {
    expect(destinoDeFallo(leer('error=server_error&error_description=boom'))).toBe(
      '/ingreso?aviso=google',
    )
    expect(destinoDeFallo(leer('code=abc'))).toBe('/ingreso?aviso=google')
  })

  it('sin nada que canjear va al ingreso sin aviso', () => {
    expect(destinoDeFallo(leer(''))).toBe('/ingreso')
  })
})

describe('destinoDeCuentaInactiva', () => {
  it('lleva el motivo', () => {
    expect(destinoDeCuentaInactiva('bloqueada')).toBe('/ingreso?aviso=bloqueada')
    expect(destinoDeCuentaInactiva('baja')).toBe('/ingreso?aviso=baja')
  })
})
