import { expect, test } from './soporte/prueba'
import { CONTRASENA, abrirConN, dialogo, entrar } from './soporte/alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarLeadsDePrueba } from './soporte/leads'
import { sesionDe, telefonoAlAzar } from './soporte/leads-alta'
import {
  PREFIJO_DE_ORIGEN_E2E,
  abrirOrigenes,
  borrarOrigenesDePrueba,
  llenarHasta,
  modalDeOrigen,
  origenEnLaBase,
  sembrarOrigen,
} from './soporte/origenes-de-lead'
import { crearAsesoraDeLaSemilla } from './soporte/recorrido'

// Los casos no felices de Configuración › Leads › Orígenes del lead (9f-1): un alta con un origen que se
// apagó mientras tanto, dos personas editando el mismo, una URL que nombra uno que no existe, el tope de
// 100 y la asesora sin permiso (por la pantalla y llamando la RPC con su sesión).
test.describe.configure({ mode: 'serial' })

let duena = ''
let asesora = ''
let proyecto = ''
const nombre = (resto: string) => `${PREFIJO_DE_ORIGEN_E2E} ${resto} ${proyecto}`

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarLeadsDePrueba()
  await borrarOrigenesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-origenes-casos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Casos' })
  asesora = (await crearAsesoraDeLaSemilla(proyecto)).email
  await sembrarOrigen(nombre('Tres'))
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await borrarOrigenesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('un alta con el origen que se apagó mientras tanto falla con un mensaje legible', async ({
  page,
}) => {
  const tres = nombre('Tres')
  const origen = await origenEnLaBase(tres)
  await entrar(page, duena)
  await abrirConN(page)
  const panel = dialogo(page)
  await panel.getByLabel('Origen del lead').selectOption(origen?.id ?? '')
  await panel.getByLabel('Nombre').fill(`E2E Alta apagada ${proyecto}`)
  await panel.getByLabel('Teléfono').first().fill(telefonoAlAzar())
  // Otra persona lo desactiva antes de que se guarde.
  await admin()
    .from('origenes_lead')
    .update({ activo: false })
    .eq('id', origen?.id ?? '')
  await panel.getByRole('button', { name: 'Guardar lead' }).click()
  await expect(panel.getByText(/desactivado|se desactivó/).first()).toBeVisible()
  // No se guardó con el origen apagado y lo escrito sigue ahí.
  const { data } = await admin()
    .from('leads')
    .select('id')
    .eq('nombre', `E2E Alta apagada ${proyecto}`)
  expect(data ?? []).toHaveLength(0)
  await expect(panel.getByLabel('Nombre')).toHaveValue(`E2E Alta apagada ${proyecto}`)
  await admin()
    .from('origenes_lead')
    .update({ activo: true })
    .eq('id', origen?.id ?? '')
})

test('dos personas editando el mismo origen: la segunda ve el conflicto y lo escrito queda', async ({
  page,
  browser,
}) => {
  const tres = nombre('Tres')
  await entrar(page, duena)
  await abrirOrigenes(page)
  await page.getByRole('button', { name: `Editar ${tres}` }).click()
  const primera = modalDeOrigen(page, 'Editar origen')
  await primera.getByLabel('Nombre').fill(nombre('Tres A'))

  const contexto = await browser.newContext({ baseURL: new URL(page.url()).origin })
  const otra = await contexto.newPage()
  await entrar(otra, duena, { fresco: true })
  await abrirOrigenes(otra)
  await otra.getByRole('button', { name: `Editar ${tres}` }).click()
  const segunda = modalDeOrigen(otra, 'Editar origen')
  await segunda.getByLabel('Nombre').fill(nombre('Tres B'))
  await segunda.getByRole('button', { name: 'Guardar' }).click()
  await expect(segunda).toBeHidden()

  await primera.getByRole('button', { name: 'Guardar' }).click()
  await expect(
    page.getByText('Otra persona cambió este origen mientras lo editabas.'),
  ).toBeVisible()
  await expect(primera.getByLabel('Nombre')).toHaveValue(nombre('Tres A'))
  expect(await origenEnLaBase(nombre('Tres B'))).toBeDefined()
  await contexto.close()
})

test('una URL que nombra un origen que no existe no abre nada y lo dice', async ({ page }) => {
  await entrar(page, duena)
  await page.goto(
    '/configuracion/leads?seccion=origenes&panel=editar-origen&origen=00000000-0000-4000-8000-000000000000',
  )
  await expect(page.getByText('Ese origen ya no existe.').first()).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect.poll(() => page.url()).not.toContain('panel=')
})

test('el tope de 100: lo dice, apaga «Nuevo origen» y la base no deja pasar', async ({ page }) => {
  await llenarHasta(100)
  await entrar(page, duena)
  await abrirOrigenes(page)
  await expect(page.getByText('Llegaste al máximo de 100 orígenes.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nuevo origen' })).toBeDisabled()
  // Por la URL tampoco abre.
  await page.goto('/configuracion/leads?seccion=origenes&panel=nuevo-origen')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await borrarOrigenesDePrueba().catch(() => undefined)
})

test('la asesora no entra a la pantalla ni puede llamar la RPC', async ({ page }) => {
  await entrar(page, asesora, { fresco: true })
  await page.goto('/configuracion/leads?seccion=origenes')
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nuevo origen' })).toHaveCount(0)

  const cliente = await sesionDe(asesora, CONTRASENA)
  const crear = await cliente.rpc('origen_lead_crear', {
    p_id: crypto.randomUUID(),
    p_nombre: nombre('Intruso'),
  })
  expect(crear.error?.code).toBe('42501')
  const lista = await cliente.rpc('origenes_lead_con_uso')
  expect(lista.error?.code).toBe('42501')
  const directo = await cliente
    .from('origenes_lead')
    .insert({ clave: 'e2e_9f_directo', nombre: nombre('Directo') })
  expect(directo.error).not.toBeNull()
  expect(await origenEnLaBase(nombre('Intruso'))).toBeUndefined()
  expect(await origenEnLaBase(nombre('Directo'))).toBeUndefined()
})
