import { createClient } from '@supabase/supabase-js'
import { expect, test } from './soporte/prueba'
import {
  desmontarSubasta,
  fijarApibara,
  prepararSubasta,
  type EstadoDeApibara,
} from './soporte/apibara'
import { entorno } from './soporte/base'
import { pedirAFuncion } from './soporte/funciones'
import { CLAVE } from './soporte/inventario'

// @sin-celular-archivo: llama a la función edge de apibara con fetch y no abre ninguna página: el ancho de la pantalla no interviene en sus tres pruebas

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
const URL_DE_LA_FUNCION = () => `${entorno('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/apibara`

// Llama a la función con la sesión de quien entra (o sin sesión). Un corte del runtime local se
// vuelve a pedir (`pedirAFuncion`); una respuesta de la función, nunca. Si no responde en ningún
// intento, la prueba falla diciéndolo.
async function llamar(cuerpo: unknown, sesion?: { email: string }) {
  const encabezados: Record<string, string> = {
    apikey: entorno('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    'Content-Type': 'application/json',
  }
  if (sesion) {
    const cliente = createClient(
      entorno('NEXT_PUBLIC_SUPABASE_URL'),
      entorno('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
      opciones,
    )
    const { data, error } = await cliente.auth.signInWithPassword({
      email: sesion.email,
      password: CLAVE,
    })
    if (error) throw error
    encabezados['Authorization'] = `Bearer ${data.session.access_token}`
  }
  const respuesta = await pedirAFuncion(
    URL_DE_LA_FUNCION(),
    { method: 'POST', headers: encabezados, body: JSON.stringify(cuerpo) },
    { etiqueta: 'apibara' },
  )
  if (!respuesta) {
    throw new Error('la función no respondió')
  }
  return {
    status: respuesta.status,
    cuerpo: (await respuesta.json().catch(() => ({}))) as unknown,
  }
}

test('sin sesión no responde nada que sirva', async () => {
  const anonimo = await llamar({ accion: 'ficha', origen: subasta.id, entrada: '58540656' })
  const cuerpo = anonimo.cuerpo as { error?: { codigo?: string } }
  // El gateway la rechaza, o la función dice que no puede.
  expect(anonimo.status === 401 || cuerpo.error?.codigo === 'sin_permiso').toBe(true)
})

test('sin permiso sobre vehículos ni sobre los ajustes de la empresa, no consulta ni ve el uso', async () => {
  const sesion = { email: sinPermisos }
  const ficha = await llamar({ accion: 'ficha', origen: subasta.id, entrada: '58540656' }, sesion)
  expect(ficha.cuerpo).toEqual({ ok: false, error: { codigo: 'sin_permiso' } })
  const uso = await llamar({ accion: 'uso' }, sesion)
  expect(uso.cuerpo).toEqual({ ok: false, error: { codigo: 'sin_permiso' } })
})

test('una foto de otro sitio no sale, y apagada no consulta nada', async () => {
  const sesion = { email: duena }
  // La clave no es un proxy abierto: sólo las dos plataformas.
  const ajena = await llamar(
    { accion: 'foto', origen: subasta.id, url: 'https://example.com/foto.jpg' },
    sesion,
  )
  expect(ajena.cuerpo).toEqual({ ok: false, error: { codigo: 'entrada' } })

  await fijarApibara(false)
  const apagada = await llamar({ accion: 'ficha', origen: subasta.id, entrada: '58540656' }, sesion)
  expect(apagada.cuerpo).toEqual({ ok: false, error: { codigo: 'apagada' } })
})
