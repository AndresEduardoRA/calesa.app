import { describe, expect, it } from 'vitest'
import { fallo, ok } from '@/shared/lib/errores'
import type { CuentasInvitadas } from '../../entities/repositorios-equipo'
import { enlaceParaInvitada, invitarPersona } from './invitar'

const ROL = '00000000-0000-0000-0000-0000000000aa'
const PERSONA = '00000000-0000-0000-0000-000000000009'
const pedido = { email: 'ana@ejemplo.com', nombre: 'Ana', rolId: ROL, origen: 'https://app.test' }

// Un Auth de mentira que anota lo que se le pide.
function auth(cambios: Partial<CuentasInvitadas> = {}) {
  const pasos: string[] = []
  const cuentas: CuentasInvitadas = {
    crear: () => {
      pasos.push('crear')
      return Promise.resolve(ok({ personaId: PERSONA }))
    },
    borrar: () => {
      pasos.push('borrar')
      return Promise.resolve()
    },
    enviarCorreo: () => {
      pasos.push('correo')
      return Promise.resolve(ok(null))
    },
    generarEnlace: () => {
      pasos.push('enlace')
      return Promise.resolve(ok({ tokenHash: 'abc', tipo: 'invite' as const }))
    },
    ...cambios,
  }
  return { cuentas, pasos }
}

const puertos = (
  cuentas: CuentasInvitadas,
  pasos: string[],
  opciones = { dominado: true, rol: true },
) => ({
  cuentas,
  roles: { dominado: () => Promise.resolve(ok(opciones.dominado)) },
  equipo: {
    asignarRol: () => {
      pasos.push('rol')
      return Promise.resolve(opciones.rol ? ok(null) : fallo('regla', 'El guardián dice que no.'))
    },
  },
})

describe('invitarPersona', () => {
  it('crea la cuenta, le da el rol y manda el correo: no hace falta enlace', async () => {
    const { cuentas, pasos } = auth()
    const hecha = await invitarPersona(puertos(cuentas, pasos), pedido)
    expect(hecha).toEqual(ok({ personaId: PERSONA, correoEnviado: true, enlace: null }))
    expect(pasos).toEqual(['crear', 'rol', 'correo'])
  })

  it('si el correo falla, el enlace se genera y se devuelve igual', async () => {
    const { cuentas, pasos } = auth({
      enviarCorreo: () => Promise.resolve(fallo('inesperado', 'Sin SMTP.')),
    })
    const hecha = await invitarPersona(puertos(cuentas, pasos), pedido)
    expect(hecha).toEqual(
      ok({
        personaId: PERSONA,
        correoEnviado: false,
        enlace: 'https://app.test/auth/callback?token_hash=abc&type=invite',
      }),
    )
    expect(pasos).toEqual(['crear', 'rol', 'enlace'])
  })

  it('sin correo y sin enlace la cuenta queda creada, para generar otro desde la lista', async () => {
    const { cuentas, pasos } = auth({
      enviarCorreo: () => Promise.resolve(fallo('inesperado', 'Sin SMTP.')),
      generarEnlace: () => Promise.resolve(fallo('inesperado', 'Auth no responde.')),
    })
    const hecha = await invitarPersona(puertos(cuentas, pasos), pedido)
    expect(hecha).toEqual(ok({ personaId: PERSONA, correoEnviado: false, enlace: null }))
    expect(pasos).not.toContain('borrar')
  })

  it('un rol que quien invita no domina se rechaza antes de crear nada', async () => {
    const { cuentas, pasos } = auth()
    const hecha = await invitarPersona(
      puertos(cuentas, pasos, { dominado: false, rol: true }),
      pedido,
    )
    expect(hecha.ok).toBe(false)
    expect(!hecha.ok && hecha.error.codigo).toBe('sin_permiso')
    expect(pasos).toEqual([])
  })

  it('un correo que ya existe da su error y no toca roles', async () => {
    const { cuentas, pasos } = auth({
      crear: () => Promise.resolve(fallo('duplicado', 'Ya existe una cuenta con ese correo.')),
    })
    const hecha = await invitarPersona(puertos(cuentas, pasos), pedido)
    expect(hecha).toEqual(fallo('duplicado', 'Ya existe una cuenta con ese correo.'))
    expect(pasos).toEqual([])
  })

  it('si no se le pudo dar el rol, la cuenta recién creada se borra', async () => {
    const { cuentas, pasos } = auth()
    const hecha = await invitarPersona(
      puertos(cuentas, pasos, { dominado: true, rol: false }),
      pedido,
    )
    expect(hecha).toEqual(fallo('regla', 'El guardián dice que no.'))
    expect(pasos).toEqual(['crear', 'rol', 'borrar'])
  })
})

describe('enlaceParaInvitada', () => {
  const origen = 'https://app.test'

  it('genera un enlace nuevo mientras la invitación está pendiente', async () => {
    const { cuentas } = auth({
      generarEnlace: () => Promise.resolve(ok({ tokenHash: 'xyz', tipo: 'recovery' as const })),
    })
    const persona = { email: 'ana@ejemplo.com', estado: 'invitacion_pendiente' as const }
    expect(await enlaceParaInvitada(cuentas, { persona, origen })).toEqual(
      ok({ enlace: 'https://app.test/auth/callback?token_hash=xyz&type=recovery' }),
    )
  })

  it('a quien ya aceptó no se le genera: no es un atajo para entrar a su cuenta', async () => {
    const { cuentas, pasos } = auth()
    const persona = { email: 'ana@ejemplo.com', estado: 'activa' as const }
    const enlace = await enlaceParaInvitada(cuentas, { persona, origen })
    expect(enlace.ok).toBe(false)
    expect(pasos).toEqual([])
  })
})
