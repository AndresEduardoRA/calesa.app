import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarLeadsDePrueba } from './soporte/leads'
import { sesionDe } from './soporte/leads-alta'
import {
  PREFIJO_DE_TIPO_E2E,
  abrirTipos,
  borrarTiposDePrueba,
  filaDeTipo,
  interruptorDe,
  llenarHasta,
  modalDeTipo,
  sembrarTipo,
  tipoDeFabrica,
  tipoEnLaBase,
} from './soporte/tipos-de-lead'
import {
  cicloDeUnaConfirmacion,
  dobleClicManda,
  noAbre,
  sinRedNoConfirma,
} from './soporte/confirmar-por-url'

// Los casos no felices de Configuración › Leads › Tipos de lead (9j): apagar el último activo de su clase con la lista vieja (lo
// dice la base y la pantalla se vuelve a leer), dos personas editando el mismo tipo, una URL que nombra uno que no existe, el tope
// de 100. La asesora sin permiso (pantalla y RPC) se prueba en `*-recorrido` y en `humo.sql`. Un alta con un tipo que se apagó mientras tanto
// está en `leads-tipos-pantallas.spec.ts`.
test.describe.configure({ mode: 'serial' })

let duena = ''
let proyecto = ''
const nombre = (resto: string) => `${PREFIJO_DE_TIPO_E2E} ${resto} ${proyecto}`

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarLeadsDePrueba()
  await borrarTiposDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-tipos-casos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Casos' })
  await sembrarTipo(nombre('Tres'))
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await borrarTiposDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('apagar el último activo de su clase con la lista vieja: la base lo rechaza, lo dice y la pantalla se vuelve a leer', async ({
  page,
}) => {
  const tres = nombre('Tres')
  const cliente = await tipoDeFabrica('cliente')
  await entrar(page, duena)
  await abrirTipos(page)
  // La pantalla ve a «Cliente» y a «Tres» activos: los dos interruptores andan.
  await expect(interruptorDe(page, tres)).toBeEnabled()
  await expect(interruptorDe(page, 'Cliente')).toBeEnabled()
  // Otra persona apaga «Cliente» (queda «Tres» como el último de su clase): esta pantalla no lo sabe.
  await admin().from('tipos_lead').update({ activo: false }).eq('id', cliente.id)
  await interruptorDe(page, tres).click()
  await expect(
    page
      .getByText('Es el único tipo activo de la clase «cliente»: activa o crea otro antes.')
      .first(),
  ).toBeVisible()
  expect(await tipoEnLaBase(tres)).toMatchObject({ activo: true })
  // La pantalla se vuelve a leer: «Cliente» aparece apagado y «Tres», ahora el único, no se puede apagar.
  await expect(filaDeTipo(page, 'Cliente').getByText('Desactivado')).toBeVisible()
  await expect(interruptorDe(page, tres)).toBeDisabled()
  await admin().from('tipos_lead').update({ activo: true }).eq('id', cliente.id)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('dos personas editando el mismo tipo: la segunda ve el conflicto y lo escrito queda', async ({
  page,
  browser,
}) => {
  const tres = nombre('Tres')
  await entrar(page, duena)
  await abrirTipos(page)
  await page.getByRole('button', { name: `Editar ${tres}` }).click()
  const primera = modalDeTipo(page, 'Editar tipo')
  await primera.getByLabel('Nombre').fill(nombre('Tres A'))

  const contexto = await browser.newContext({ baseURL: new URL(page.url()).origin })
  const otra = await contexto.newPage()
  await entrar(otra, duena, { fresco: true })
  await abrirTipos(otra)
  await otra.getByRole('button', { name: `Editar ${tres}` }).click()
  const segunda = modalDeTipo(otra, 'Editar tipo')
  await segunda.getByLabel('Nombre').fill(nombre('Tres B'))
  await segunda.getByRole('button', { name: 'Guardar' }).click()
  await expect(segunda).toBeHidden()

  await primera.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Otra persona cambió este tipo mientras lo editabas.')).toBeVisible()
  await expect(primera.getByLabel('Nombre')).toHaveValue(nombre('Tres A'))
  expect(await tipoEnLaBase(nombre('Tres B'))).toBeDefined()
  await contexto.close()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('una URL que nombra un tipo que no existe no abre nada y lo dice', async ({ page }) => {
  await entrar(page, duena)
  await page.goto(
    '/configuracion/leads?seccion=tipos&panel=editar-tipo&tipo=00000000-0000-4000-8000-000000000000',
  )
  await expect(page.getByText('Ese tipo ya no existe.').first()).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect.poll(() => page.url()).not.toContain('panel=')
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('el tope de 100: lo dice, apaga «Nuevo tipo» y la base no deja pasar', async ({ page }) => {
  await llenarHasta(100)
  await entrar(page, duena)
  await abrirTipos(page)
  await expect(page.getByText('Llegaste al máximo de 100 tipos.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nuevo tipo' })).toBeDisabled()
  await expect(page.getByText('100 de 100 tipos posibles.')).toBeVisible()
  // Por la URL tampoco abre.
  await page.goto('/configuracion/leads?seccion=tipos&panel=nuevo-tipo')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // Y la base lo rechaza aunque se llame sin la pantalla.
  const cliente = await sesionDe(duena, CONTRASENA)
  const crear = await cliente.rpc('tipo_lead_crear', {
    p_id: crypto.randomUUID(),
    p_nombre: nombre('El ciento uno'),
    p_clase: 'cliente',
  })
  expect(crear.error?.message).toContain('máximo')
  await borrarTiposDePrueba().catch(() => undefined)
})

test('eliminar un tipo: su URL, Esc, atrás, recarga, sin red y un solo pedido; uno que no existe no abre', async ({
  page,
  context,
}) => {
  const url = nombre('Url')
  await sembrarTipo(url)
  await entrar(page, duena, { fresco: true })
  await abrirTipos(page)
  const disparador = page.getByRole('button', { name: `Eliminar ${url}` })
  const dialogo = page.getByRole('dialog', { name: `Eliminar el tipo «${url}»` })
  await cicloDeUnaConfirmacion(page, {
    abrir: () => disparador.click(),
    dialogo,
    disparador,
    url: /panel=eliminar-tipo&tipo=/,
  })
  const confirmar = dialogo.getByRole('button', { name: 'Eliminar tipo' })
  await sinRedNoConfirma(context, dialogo, confirmar)
  expect(await dobleClicManda(page, confirmar)).toBe(1)
  await expect(dialogo).toBeHidden()
  expect(await tipoEnLaBase(url)).toBeUndefined()

  await noAbre(
    page,
    '/configuracion/leads?seccion=tipos&panel=eliminar-tipo&tipo=00000000-0000-4000-8000-000000000999',
    'Ese tipo ya no existe.',
    /panel=eliminar-tipo/,
  )
})
