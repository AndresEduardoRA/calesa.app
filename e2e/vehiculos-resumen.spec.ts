import { expect, test } from './soporte/prueba'
import { aLaVista, editarDesdeLaLista, entrar } from './soporte/inventario'
import { crearLead, marcarInteres } from './soporte/leads'
import { capturar, sinScrollHorizontal } from './soporte/recorrido'
import {
  OTRO,
  TITULO,
  abrirConUnClic,
  alInventario,
  filaDe,
  limpiarResumen,
  prepararResumen,
  resumenDe,
  sembrarFotos,
  type TerrenoDelResumen,
} from './soporte/vehiculos-resumen'

// El resumen de un vehículo (`?vehiculo=`, 9i): un clic en cualquier parte de la fila o la tarjeta lo abre; arriba la portada, lo que
// lo identifica y su estado, con «Editar» y «Abrir ficha»; «Resumen», «Fotos» e «Interesados», y lo que cuesta. Editarlo, y los casos
// que no son el feliz, en `vehiculos-resumen-casos.spec.ts`. Capturas: `E2E_CAPTURAS=e2e-capturas/9i`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelResumen

test.beforeAll(async ({}, info) => {
  t = await prepararResumen(info.project.name)
})

test.afterAll(async () => {
  await limpiarResumen(t.id)
})

test('un clic en cualquier parte de la fila o la tarjeta abre el resumen, con lo que identifica al vehículo', async ({
  page,
}, info) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  const resumen = await abrirConUnClic(page, TITULO)
  await expect(page).toHaveURL(new RegExp(`vehiculo=${t.id}`))
  // La fila queda marcada como la abierta.
  await expect(filaDe(page, TITULO)).toHaveAttribute('data-state', 'selected')
  // Arriba: lo que lo identifica (el número, lo «en tarjeta» del layout), su estado y lo que se puede hacer.
  await expect(resumen.getByText('Corea · #')).toBeAttached()
  // Lo «en tarjeta» está arriba y, con el resto de los datos, también en la pestaña.
  await expect(resumen.getByText('Puertas').first()).toBeVisible()
  await expect(resumen.getByText('Sin fase')).toBeVisible()
  await expect(resumen.getByRole('button', { name: 'Editar', exact: true })).toBeVisible()
  await expect(resumen.getByRole('link', { name: 'Abrir ficha' })).toHaveAttribute(
    'href',
    `/vehiculos/${t.id}`,
  )
  // «Resumen» es la pestaña de siempre y trae los datos como la ficha, sin pedir nada más.
  await expect(resumen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(resumen.getByText('Blanco').first()).toBeVisible()
  await capturar(page, info, 'resumen-de-vehiculo')
  // Recargar lo reabre; cerrar lo cierra.
  await page.reload()
  await expect(resumenDe(page, TITULO)).toBeVisible()
  await resumenDe(page, TITULO).getByRole('button', { name: 'Cerrar' }).click()
  await expect(page).not.toHaveURL(/vehiculo=/)
  await expect(resumenDe(page, TITULO)).toHaveCount(0)
})

test('con el teclado se alcanza el nombre, Enter abre el resumen y al cerrarlo el foco vuelve', async ({
  page,
}) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  const nombre = aLaVista(page.getByRole('button', { name: `Abrir ${OTRO}`, exact: true }))
  await nombre.focus()
  await page.keyboard.press('Enter')
  await expect(resumenDe(page, OTRO)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(resumenDe(page, OTRO)).toHaveCount(0)
  await expect(nombre).toBeFocused()
})

test('«Editar» del «⋯» de la fila abre el panel de edición, no el resumen', async ({ page }) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  await editarDesdeLaLista(page, TITULO)
  const panel = page.getByRole('dialog', { name: `Editar ${TITULO}` })
  await expect(panel).toBeVisible()
  await expect(page).not.toHaveURL(/vehiculo=/)
  await panel.getByRole('button', { name: 'Cancelar' }).click()
})

test('«Fotos» e «Interesados» leen al elegirse, sin sumar al historial', async ({ page }, info) => {
  await sembrarFotos(t.id, 3)
  const marta = await crearLead({
    nombre: 'Marta Resumen',
    telefono: `591788${String(Math.floor(Math.random() * 90000) + 10000)}`,
    deQuien: t.lector,
  })
  await marcarInteres({ vehiculoId: t.id, leadId: marta, quien: t.lector, nota: 'Pidió el precio' })

  await entrar(page, t.lector)
  await alInventario(page, t.terreno.corea.id)
  const resumen = await abrirConUnClic(page, TITULO)
  // Abrir el resumen no leyó las fotos ni los interesados: cada pestaña paga lo suyo al elegirse.
  const pedidos: string[] = []
  page.on('request', (pedido) => {
    if (pedido.url().includes('/rest/v1/')) {
      pedidos.push(pedido.url())
    }
  })
  await resumen.getByRole('tab', { name: 'Fotos' }).click()
  await expect(page).toHaveURL(/pestana=fotos/)
  await expect(
    resumen.getByRole('link', { name: 'Abrir la foto 1 de 3 en otra pestaña (portada)' }),
  ).toBeVisible()
  await expect(resumen.getByRole('link', { name: /^Abrir la foto \d de 3/ })).toHaveCount(3)
  expect(pedidos.filter((url) => url.includes('vehiculos_imagenes'))).toHaveLength(1)
  await capturar(page, info, 'resumen-fotos')

  await resumen.getByRole('tab', { name: 'Interesados' }).click()
  await expect(page).toHaveURL(/pestana=interesados/)
  await expect(resumen.getByText('E2E Marta Resumen')).toBeVisible()
  await expect(resumen.getByText('Pidió el precio')).toBeVisible()
  expect(pedidos.filter((url) => url.includes('vehiculo_interesados'))).toHaveLength(1)
  expect(pedidos.filter((url) => url.includes('vehiculo_vinculos'))).toHaveLength(1)

  // Cambiar de pestaña no sumó al historial: «atrás» cierra el resumen.
  await page.goBack()
  await expect(resumenDe(page, TITULO)).toHaveCount(0)
})

test('quien no ve leads no tiene «Interesados», y una pestaña que no existe abre «Resumen»', async ({
  page,
}) => {
  await entrar(page, t.lectorSinLeads)
  await alInventario(page, t.terreno.corea.id, `&vehiculo=${t.id}&pestana=interesados`)
  const resumen = resumenDe(page, TITULO)
  await expect(resumen).toBeVisible()
  await expect(resumen.getByRole('tab')).toHaveCount(2)
  await expect(resumen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(resumen.getByRole('tab', { name: 'Interesados' })).toHaveCount(0)
})

test('abrir el resumen cuesta un pedido a la base y nada antes de abrirlo', async ({ page }) => {
  await entrar(page, t.terreno.duena)
  const pedidos: string[] = []
  page.on('request', (pedido) => {
    if (pedido.url().includes('/rest/v1/')) {
      pedidos.push(pedido.url())
    }
  })
  await alInventario(page, t.terreno.corea.id)
  await expect(filaDe(page, TITULO)).toBeVisible()
  expect(pedidos).toHaveLength(0)
  await abrirConUnClic(page, TITULO)
  await expect.poll(() => pedidos.length).toBeGreaterThan(0)
  await page.waitForLoadState('networkidle')
  expect(pedidos.length).toBeLessThanOrEqual(2)
  expect(pedidos[0]).toContain('/rest/v1/vehiculos')
})

test('con el texto al 200 % el resumen no ensancha la página', async ({ page }, info) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  const resumen = await abrirConUnClic(page, TITULO)
  await expect(resumen.getByRole('link', { name: 'Abrir ficha' })).toBeVisible()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'resumen-200')
  await page.emulateMedia({ colorScheme: 'dark' })
  await capturar(page, info, 'resumen-200-oscuro')
})
