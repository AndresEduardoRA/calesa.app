import { createClient } from '@supabase/supabase-js'
import { expect, test } from './soporte/prueba'
import {
  desmontarSubasta,
  fijarApibara,
  prepararSubasta,
  type EstadoDeApibara,
} from './soporte/apibara'
import { entorno } from './soporte/base'
import { CLAVE } from './soporte/inventario'

// La edge function `apibara` de verdad (la que sirve el runtime local), sólo en los caminos que no
// llegan a apibara: ningún test llama a la API real. Qué responde con la API se prueba cargando el
// código con un `fetch` simulado (`src/modules/vehiculos/infra/funcion-apibara*.test.ts`).
let duena = ''
let sinPermisos = ''
let subasta = { id: '', nombre: '' }
let apibaraAntes: EstadoDeApibara

test.beforeAll(async ({}, info) => {
  ;({ duena, sinPermisos, subasta, apibaraAntes } = await prepararSubasta(info.project.name))
})

test.afterAll(async () => {
  await desmontarSubasta(apibaraAntes)
})

const opciones = { auth: { persistSession: false, autoRefreshToken: false } }

test('sin sesión no responde nada que sirva', async () => {
  const anonimo = await fetch(`${entorno('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/apibara`, {
    method: 'POST',
    headers: {
      apikey: entorno('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accion: 'ficha', origen: subasta.id, entrada: '58540656' }),
  })
  const cuerpo = (await anonimo.json().catch(() => ({}))) as { error?: { codigo?: string } }
  // El gateway la rechaza, o la función dice que no puede.
  expect(anonimo.status === 401 || cuerpo.error?.codigo === 'sin_permiso').toBe(true)
})

test('sin permiso sobre vehículos ni sobre los ajustes de la empresa, no consulta ni ve el uso', async () => {
  const cliente = createClient(
    entorno('NEXT_PUBLIC_SUPABASE_URL'),
    entorno('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    opciones,
  )
  await cliente.auth.signInWithPassword({ email: sinPermisos, password: CLAVE })
  const ficha = await cliente.functions.invoke('apibara', {
    body: { accion: 'ficha', origen: subasta.id, entrada: '58540656' },
  })
  expect(ficha.data).toEqual({ ok: false, error: { codigo: 'sin_permiso' } })
  const uso = await cliente.functions.invoke('apibara', { body: { accion: 'uso' } })
  expect(uso.data).toEqual({ ok: false, error: { codigo: 'sin_permiso' } })
})

test('una foto de otro sitio no sale, y apagada no consulta nada', async () => {
  const cliente = createClient(
    entorno('NEXT_PUBLIC_SUPABASE_URL'),
    entorno('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    opciones,
  )
  await cliente.auth.signInWithPassword({ email: duena, password: CLAVE })
  // La clave no es un proxy abierto: sólo las dos plataformas.
  const ajena = await cliente.functions.invoke('apibara', {
    body: { accion: 'foto', origen: subasta.id, url: 'https://example.com/foto.jpg' },
  })
  expect(ajena.data).toEqual({ ok: false, error: { codigo: 'entrada' } })

  await fijarApibara(false)
  const apagada = await cliente.functions.invoke('apibara', {
    body: { accion: 'ficha', origen: subasta.id, entrada: '58540656' },
  })
  expect(apagada.data).toEqual({ ok: false, error: { codigo: 'apagada' } })
})
