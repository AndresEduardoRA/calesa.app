import { describe, expect, it } from 'vitest'
import { enlaceDeInvitacion } from './invitacion'

describe('enlaceDeInvitacion', () => {
  it('entra por /auth/callback con token_hash y el tipo', () => {
    expect(enlaceDeInvitacion('https://app.empresa.com', 'abc123', 'invite')).toBe(
      'https://app.empresa.com/auth/callback?token_hash=abc123&type=invite',
    )
  })

  it('no duplica la barra ni rompe con caracteres raros', () => {
    expect(enlaceDeInvitacion('http://localhost:3000/', 'a+b/c', 'recovery')).toBe(
      'http://localhost:3000/auth/callback?token_hash=a%2Bb%2Fc&type=recovery',
    )
  })
})
