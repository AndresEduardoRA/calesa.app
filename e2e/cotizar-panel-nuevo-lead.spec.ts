import { expect, test, type Locator, type Page } from './soporte/prueba'
import { dialogo, entrar } from './soporte/alta'
import {
  guardarConElAtajo,
  limpiarGuardado,
  type PedidoDeGuardadoVisto,
  prepararGuardado,
  tarjetaGuardada,
  tipearEnLaHoja,
  totalDeLaHoja,
  vigilarGuardados,
} from './soporte/cotizar-guardar'
import { telefonoAlAzar } from './soporte/leads-alta'
import { literal, sql } from './soporte/sql'

// «Nuevo lead» desde el panel del cliente de la hoja de cotizar (paso 4.14-3c, `docs/UX.md` › «Cotizar»): el «+» del panel cierra el panel y abre «Nuevo lead» (el del shell) con
// `?elegir=lead`; al guardar, «Nuevo lead» se cierra y la hoja elige al creado, conservando lo tipeado, con el foco en la barra «Cliente» y el aviso sin «Abrir ficha» (P1).
test.describe.configure({ mode: 'serial' })

let origenId = ''
let duena = ''
let propio = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  const preparado = await prepararGuardado(info.project.name, 'nuevolead')
  origenId = preparado.origen.id
  duena = preparado.duena
  propio = {
    id: preparado.lead,
    nombre: sql(`select nombre from public.leads where id = ${literal(preparado.lead)}::uuid`),
  }
})

test.afterAll(async () => {
  await limpiarGuardado()
})

const barra = (page: Page): Locator => page.getByRole('button', { name: /^Cliente:/ })
const panelCliente = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Cliente', exact: true })
const nuevoLead = (page: Page): Locator => page.getByRole('button', { name: 'Nuevo lead' })

// Los guardados de la cotización: el vigilante ve también la action que crea el lead (su POST sale de la misma página, sin `entradas`).
const deLaCotizacion = (guardados: Awaited<ReturnType<typeof vigilarGuardados>>) =>
  guardados.pedidos.filter(
    (pedido) => (pedido as Partial<PedidoDeGuardadoVisto>).entradas !== undefined,
  )

async function abrirLaHoja(page: Page, extra = ''): Promise<void> {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origenId}${extra}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
}

// Abre el panel del cliente y pulsa «+»: «Nuevo lead» queda abierto con el foco en el teléfono.
async function abrirNuevoLeadDesdeElPanel(page: Page): Promise<Locator> {
  await barra(page).click()
  await expect(panelCliente(page)).toBeVisible()
  await nuevoLead(page).click()
  const alta = dialogo(page)
  await expect(alta).toBeVisible()
  await expect(panelCliente(page)).toBeHidden()
  return alta
}

test('E2E «+» cierra el panel y abre «Nuevo lead» con `elegir`, el foco en el teléfono; «atrás» vuelve a la hoja sin panel', async ({
  page,
}) => {
  await abrirLaHoja(page)
  const alta = await abrirNuevoLeadDesdeElPanel(page)
  await expect(page).toHaveURL(/panel=nuevo-lead/)
  expect(new URL(page.url()).searchParams.get('elegir')).toBe('lead')
  await expect(alta.getByLabel('Teléfono principal')).toBeFocused()
  await page.goBack()
  await expect(alta).toBeHidden()
  await expect(panelCliente(page)).toBeHidden()
  await expect.poll(() => new URL(page.url()).searchParams.get('panel')).toBeNull()
  await expect(barra(page)).toContainText('Selecciona un cliente')
})

test('E2E guardar el lead elige al creado, conserva lo tipeado, deja el foco en la barra y guardar la cotización lleva ese lead', async ({
  page,
}, info) => {
  const guardados = await vigilarGuardados(page)
  await abrirLaHoja(page)
  await tipearEnLaHoja(page, 'pub', '100')
  await expect(totalDeLaHoja(page)).toContainText('105,00')
  const alta = await abrirNuevoLeadDesdeElPanel(page)
  const nombre = `E2E Desde la hoja ${info.project.name}`
  await alta.getByLabel('Teléfono principal').fill(telefonoAlAzar())
  await alta.getByLabel('Nombre').fill(nombre)
  await alta.getByRole('button', { name: 'Guardar lead' }).click()
  const creado = await expect
    .poll(() => sql(`select id from public.leads where nombre = ${literal(nombre)}`))
    .not.toBe('')
    .then(() => sql(`select id from public.leads where nombre = ${literal(nombre)}`))
  await expect(page).toHaveURL(new RegExp(`lead=${creado}`))
  const url = new URL(page.url())
  expect(url.searchParams.get('panel')).toBeNull()
  expect(url.searchParams.get('elegir')).toBeNull()
  await expect(alta).toBeHidden()
  await expect(barra(page)).toContainText(nombre.replace(/^E2E /, ''))
  await expect(barra(page)).toBeFocused()
  // El aviso dice «Lead creado» y no ofrece salir: la cotización quedaría a medias.
  const aviso = page.locator('[data-sonner-toast]').filter({ hasText: /Lead creado/ })
  await expect(aviso).toBeVisible()
  await expect(aviso.getByRole('button', { name: 'Abrir ficha' })).toHaveCount(0)
  // Lo tipeado sigue.
  await expect(totalDeLaHoja(page)).toContainText('105,00')
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(deLaCotizacion(guardados).map((pedido) => pedido.leadId)).toEqual([creado])
  const intento = deLaCotizacion(guardados)[0]?.intento ?? ''
  expect(sql(`select lead_id from public.cotizaciones where id = ${literal(intento)}::uuid`)).toBe(
    creado,
  )
})

test('E2E un teléfono que ya es de un lead que se ve ofrece «Elegir»: la hoja elige ese lead sin crear otro', async ({
  page,
}) => {
  await abrirLaHoja(page)
  const alta = await abrirNuevoLeadDesdeElPanel(page)
  const telefono = sql(
    `select telefono_principal from public.leads where id = ${literal(propio.id)}::uuid`,
  )
  await alta.getByLabel('Teléfono principal').fill(`+${telefono}`)
  const elegir = alta.getByRole('button', { name: 'Elegir', exact: true })
  await expect(elegir).toBeVisible()
  await elegir.click()
  await expect(page).toHaveURL(new RegExp(`lead=${propio.id}`))
  await expect(alta).toBeHidden()
  await expect(barra(page)).toContainText(propio.nombre)
})

test('E2E Ctrl+S con «Nuevo lead» abierto sobre la hoja crea el lead y no manda ningún guardado de la cotización', async ({
  page,
}, info) => {
  const guardados = await vigilarGuardados(page)
  await abrirLaHoja(page)
  await tipearEnLaHoja(page, 'pub', '100')
  const alta = await abrirNuevoLeadDesdeElPanel(page)
  const nombre = `E2E Atajo ${info.project.name}`
  await alta.getByLabel('Teléfono principal').fill(telefonoAlAzar())
  await alta.getByLabel('Nombre').fill(nombre)
  await guardarConElAtajo(page)
  await expect
    .poll(() => sql(`select count(*) from public.leads where nombre = ${literal(nombre)}`))
    .toBe('1')
  await expect(barra(page)).toContainText(nombre.replace(/^E2E /, ''))
  expect(deLaCotizacion(guardados)).toHaveLength(0)
  // Elegido el lead, Ctrl+S vuelve a ser de la hoja.
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(deLaCotizacion(guardados)).toHaveLength(1)
})

test('E2E Esc sin guardar cierra «Nuevo lead» sin `panel` ni `elegir`, deja el lead de antes y el foco en la barra', async ({
  page,
}) => {
  await abrirLaHoja(page, `&lead=${propio.id}`)
  const alta = await abrirNuevoLeadDesdeElPanel(page)
  await page.keyboard.press('Escape')
  await expect(alta).toBeHidden()
  // `nuqs` escribe la URL tras un instante: se espera el estado final.
  await expect.poll(() => new URL(page.url()).searchParams.get('panel')).toBeNull()
  const url = new URL(page.url())
  expect(url.searchParams.get('elegir')).toBeNull()
  expect(url.searchParams.get('lead')).toBe(propio.id)
  await expect(barra(page)).toContainText(propio.nombre.replace(/^E2E /, ''))
  await expect(barra(page)).toBeFocused()
})
