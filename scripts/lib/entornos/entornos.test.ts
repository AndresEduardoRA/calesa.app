import { describe, expect, it, vi } from 'vitest'

import type { Pedir } from './lectura'
import { leerAuth, leerSecretosDeLasFunciones } from './supabase'
import { leerVariablesDeVercel } from './vercel'

const json = (cuerpo: unknown, estado = 200) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado }))
const pedirCon = (cuerpo: unknown, estado = 200) => vi.fn<Pedir>(() => json(cuerpo, estado))

describe('lector de Vercel', () => {
  it('de la respuesta sólo salen nombres, por destino, sin repetir y sin el valor', async () => {
    const pedir = pedirCon({
      envs: [
        { key: 'B', target: ['production', 'preview'], type: 'plain', value: 'VALOR-SECRETO-1' },
        { key: 'A', target: ['production'], value: 'VALOR-SECRETO-1' },
        { key: 'SOLO_PREVIEW', target: ['preview'] },
        { key: 'DE_TODOS' },
        { key: 'TEXTO', target: 'production' },
        { key: 'B', target: ['production'] },
      ],
    })
    const r = await leerVariablesDeVercel({ pedir, token: 'TOKEN-PRUEBA', proyecto: 'prj_1' })
    expect(r).toEqual({
      ok: true,
      datos: {
        production: ['A', 'B', 'DE_TODOS', 'TEXTO'],
        preview: ['B', 'DE_TODOS', 'SOLO_PREVIEW'],
      },
    })
    expect(JSON.stringify(r)).not.toContain('VALOR-SECRETO-1')
  })

  it('pide la URL esperada con el token en la cabecera, y el equipo si lo hay', async () => {
    const pedir = pedirCon({ envs: [] })
    await leerVariablesDeVercel({
      pedir,
      token: 'TOKEN-PRUEBA',
      proyecto: 'prj_1',
      equipo: 'team_9',
    })
    expect(pedir).toHaveBeenCalledWith(
      'https://api.vercel.com/v10/projects/prj_1/env?teamId=team_9',
      {
        headers: { Authorization: 'Bearer TOKEN-PRUEBA' },
      },
    )
  })

  it('un fallo dice «HTTP n» o «sin respuesta», sin cuerpo ni mensaje', async () => {
    const r401 = await leerVariablesDeVercel({
      pedir: pedirCon({ error: 'TOKEN-PRUEBA inválido' }, 401),
      token: 'TOKEN-PRUEBA',
      proyecto: 'p',
    })
    expect(r401).toEqual({ ok: false, motivo: 'la API respondió HTTP 401' })
    const caida = await leerVariablesDeVercel({
      pedir: () => Promise.reject(new Error('fallo con TOKEN-PRUEBA en https://api.vercel.com/x')),
      token: 'TOKEN-PRUEBA',
      proyecto: 'p',
    })
    expect(caida).toEqual({ ok: false, motivo: 'sin respuesta' })
    const rara = await leerVariablesDeVercel({
      pedir: pedirCon({ otra: 1 }),
      token: 't',
      proyecto: 'p',
    })
    expect(rara).toEqual({ ok: false, motivo: 'respuesta con otra forma' })
  })
})

describe('lectores de Supabase', () => {
  it('los secretos de las funciones: sólo los nombres', async () => {
    const pedir = pedirCon([
      { name: 'VAPID_SUBJECT', value: 'HASH-2', updated_at: 'hoy' },
      { name: 'VAPID_PRIVATE_KEY', value: 'HASH-2' },
    ])
    const r = await leerSecretosDeLasFunciones({ pedir, token: 'TOKEN-PRUEBA', ref: 'abc' })
    expect(r).toEqual({ ok: true, datos: ['VAPID_PRIVATE_KEY', 'VAPID_SUBJECT'] })
    expect(pedir).toHaveBeenCalledWith('https://api.supabase.com/v1/projects/abc/secrets', {
      headers: { Authorization: 'Bearer TOKEN-PRUEBA' },
    })
  })

  it('Auth: cada ajuste sale presente o distinto; ningún valor sale', async () => {
    const pedir = pedirCon({
      site_url: 'https://x.example',
      uri_allow_list: 'https://x.example/**',
      smtp_host: 'smtp.example',
      smtp_user: '',
      smtp_pass: 'CLAVE-3',
      mailer_otp_exp: 3600,
      mailer_templates_invite_content: '<p>hola</p>',
      otro_ajuste: 'no se lee',
    })
    const r = await leerAuth({ pedir, token: 'TOKEN-PRUEBA', ref: 'abc' })
    expect(r).toEqual({
      ok: true,
      datos: {
        site_url: 'presente',
        uri_allow_list: 'presente',
        smtp_host: 'presente',
        smtp_pass: 'presente',
        mailer_otp_exp: 'distinto',
        mailer_templates_invite_content: 'presente',
      },
    })
    expect(JSON.stringify(r)).not.toMatch(/CLAVE-3|x\.example|smtp\.example|hola/)
    expect(pedir).toHaveBeenCalledWith('https://api.supabase.com/v1/projects/abc/config/auth', {
      headers: { Authorization: 'Bearer TOKEN-PRUEBA' },
    })
  })

  it('la vida de la invitación de 86400 (número o texto) está presente', async () => {
    for (const valor of [86400, '86400']) {
      const r = await leerAuth({ pedir: pedirCon({ mailer_otp_exp: valor }), token: 't', ref: 'a' })
      expect(r).toEqual({ ok: true, datos: { mailer_otp_exp: 'presente' } })
    }
  })

  it('un 403 y un error de red se dicen sin detalle', async () => {
    expect(await leerAuth({ pedir: pedirCon({}, 403), token: 't', ref: 'a' })).toEqual({
      ok: false,
      motivo: 'la API respondió HTTP 403',
    })
    const caida = await leerSecretosDeLasFunciones({
      pedir: () => Promise.reject(new Error('ECONNRESET')),
      token: 't',
      ref: 'a',
    })
    expect(caida).toEqual({ ok: false, motivo: 'sin respuesta' })
  })
})
