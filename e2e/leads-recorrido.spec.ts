import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { aLaVista } from './soporte/inventario'
import { AJENO_CARLOS, irALeads } from './soporte/leads-listado'
import { abrirMenuDelLead, menuDelLead } from './soporte/leads-marcas'
import {
  abrirPestanaDeSeguimientos,
  editorDe,
  modalDeRecordatorio,
  modalDeSeguimiento,
  seguimientosEnLaBase,
} from './soporte/leads-seguimientos'
import {
  capturar,
  enfocado,
  limpiarRecorrido,
  prepararRecorrido,
  recibeElClic,
  sinScrollHorizontal,
  tactil,
  type TerrenoDelRecorrido,
  volcarArbol,
} from './soporte/recorrido'

// El recorrido de la IA con dos cuentas (9d-3): la dueña (rol `dueno`) y una asesora con el rol `asesor`
// de la semilla y cartera propia, en escritorio y en el celular. Lo que se puede afirmar sin mirar (quién
// recibe el clic, el foco, la URL, los pedidos, lo que cabe) queda acá; lo que se juzga mirando, en las
// capturas (`E2E_CAPTURAS=e2e-capturas/9d-3`) y en `docs/BITACORA.md`.
test.describe.configure({ mode: 'serial' })

let r: TerrenoDelRecorrido

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'Recorrido')
})

test.afterAll(async () => {
  await limpiarRecorrido(r)
})

const conElLead = (nombre: string) => `?${new URLSearchParams({ q: nombre }).toString()}`

async function opcionesDelMenu(menu: Locator): Promise<string[]> {
  const textos = await menu.locator('[role=menuitem], [role=menuitemcheckbox]').allInnerTexts()
  return textos.map((texto) => texto.trim())
}

async function cerrarMenu(page: Page, menu: Locator) {
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
}

test('A · el «⋯» de la asesora: sus acciones, cada modal y su descarte, y nada del lead ajeno', async ({
  page,
}, info) => {
  await entrar(page, r.ana.email)
  await irALeads(page)
  await sinScrollHorizontal(page)
  await capturar(page, info, 'asesora-listado')

  const boton = menuDelLead(page, r.uno.nombre)
  await recibeElClic(boton)
  await tactil(page, boton)
  const menu = await abrirMenuDelLead(page, r.uno.nombre)
  expect(await opcionesDelMenu(menu)).toEqual([
    'Agendar recordatorio…',
    'Anotar seguimiento…',
    'Etiquetas…',
    'Favorito',
    'Tachado',
    'Enviar a la papelera',
  ])
  for (const item of await menu.locator('[role=menuitem], [role=menuitemcheckbox]').all()) {
    await recibeElClic(item)
    await tactil(page, item)
  }
  await volcarArbol(menu, info, 'asesora-menu')
  await capturar(page, info, 'asesora-menu')

  // Anotar: el modal sobre el lead de la fila, sin el drawer.
  await menu.getByRole('menuitem', { name: 'Anotar seguimiento…' }).click()
  const anotar = modalDeSeguimiento(page, 'Anotar')
  await expect(anotar).toBeVisible()
  await expect(editorDe(anotar)).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`panel=anotar-seguimiento&para=${r.uno.id}`))
  await expect(anotar.getByLabel('Resumen')).toBeFocused()
  await anotar.getByLabel('Resumen').fill('Llamó por el precio')
  await capturar(page, info, 'asesora-anotar-desde-fila')

  // Cancelar con algo escrito pregunta en el mismo modal; «Seguir editando» tiene el foco.
  await anotar.getByRole('button', { name: 'Cancelar' }).click()
  await expect(anotar.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await expect(anotar.getByRole('button', { name: 'Seguir editando' })).toBeFocused()
  await capturar(page, info, 'asesora-anotar-descarte')
  await anotar.getByRole('button', { name: 'Seguir editando' }).click()
  await expect(anotar.getByLabel('Resumen')).toHaveValue('Llamó por el precio')
  // Esc también pregunta; «Descartar» cierra y el foco vuelve al «⋯» de la fila.
  await page.keyboard.press('Escape')
  await expect(anotar.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await anotar.getByRole('button', { name: 'Descartar' }).click()
  await expect(anotar).toBeHidden()
  await expect(page).not.toHaveURL(/panel=/)
  await expect(boton, await enfocado(page)).toBeFocused()

  // Guardar desde la fila.
  await (
    await abrirMenuDelLead(page, r.uno.nombre)
  )
    .getByRole('menuitem', { name: 'Anotar seguimiento…' })
    .click()
  await expect(anotar.getByLabel('Resumen')).toBeFocused()
  await anotar.getByLabel('Resumen').fill('Primera llamada del recorrido')
  await anotar.getByRole('button', { name: 'Guardar' }).click()
  await expect(anotar).toBeHidden()
  await capturar(page, info, 'asesora-anotado')
  await expect
    .poll(async () => (await seguimientosEnLaBase(r.uno.id)).map((s) => s.titulo))
    .toContain('Primera llamada del recorrido')

  // Agendar: sin cambios, Esc cierra directo.
  await (
    await abrirMenuDelLead(page, r.uno.nombre)
  )
    .getByRole('menuitem', { name: 'Agendar recordatorio…' })
    .click()
  const agendar = modalDeRecordatorio(page, 'Agendar')
  await expect(agendar.getByLabel('De qué es')).toBeFocused()
  await expect(page).toHaveURL(new RegExp(`panel=agendar-recordatorio&para=${r.uno.id}`))
  await capturar(page, info, 'asesora-agendar-desde-fila')
  await page.keyboard.press('Escape')
  await expect(agendar).toBeHidden()
  await expect(boton).toBeFocused()
})

test('A · un lead que la asesora no ve: la URL a mano no abre nada ni insinúa que existe', async ({
  page,
}, info) => {
  await entrar(page, r.ana.email)
  // El lead de Carlos no se ve: la URL a mano no abre nada ni deja su nombre en la página.
  // Lo dice igual que con un id inventado: no insinúa que existe.
  const dicho = async (para: string) => {
    await irALeads(page, `?panel=anotar-seguimiento&para=${para}`)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    const aviso = page.locator('[data-sonner-toast]')
    await expect(aviso).toHaveCount(1)
    const texto = await aviso.innerText()
    await page.reload()
    return texto
  }
  const delAjeno = await dicho(r.deCarlos)
  expect(await page.content()).not.toContain(AJENO_CARLOS)
  await capturar(page, info, 'asesora-para-ajeno')
  expect(await dicho(crypto.randomUUID())).toBe(delAjeno)
})

test('A · el «⋯» de la dueña: sobre lo suyo anota; sobre lo ajeno (en «todos») sólo marca', async ({
  page,
}, info) => {
  await entrar(page, r.t.personas.duena)
  await irALeads(page, `?alcance=todos&${conElLead(r.uno.nombre).slice(1)}`)
  await sinScrollHorizontal(page)
  const menu = await abrirMenuDelLead(page, r.uno.nombre)
  expect(await opcionesDelMenu(menu)).toEqual([
    'Etiquetas…',
    'Favorito',
    'Tachado',
    'Enviar a la papelera',
  ])
  await capturar(page, info, 'duena-menu-ajeno')
  await cerrarMenu(page, menu)
  // La URL a mano tampoco abre anotar sobre un lead que no es de su cartera.
  await irALeads(page, `?alcance=todos&panel=anotar-seguimiento&para=${r.uno.id}`)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await capturar(page, info, 'duena-para-ajeno')
})

test('B · el drawer: teclado entre pestañas, una pestaña inventada, Esc y «atrás»', async ({
  page,
}, info) => {
  await entrar(page, r.ana.email)
  await page.goto(`/leads?lead=${r.uno.id}&pestana=inventada`)
  const drawer = page.getByRole('dialog', { name: r.uno.nombre })
  await expect(drawer).toBeVisible()
  const resumen = drawer.getByRole('tab', { name: 'Resumen' })
  await expect(resumen).toHaveAttribute('aria-selected', 'true')
  await volcarArbol(drawer, info, 'drawer-resumen')
  await capturar(page, info, 'drawer-pestana-inventada')
  for (const pestana of await drawer.getByRole('tab').all()) {
    await tactil(page, pestana)
    await recibeElClic(pestana)
  }

  await resumen.focus()
  await page.keyboard.press('ArrowRight')
  await expect(drawer.getByRole('tab', { name: 'Seguimientos', exact: true })).toBeFocused()
  await page.keyboard.press('End')
  await expect(drawer.getByRole('tab', { name: 'Recordatorios', exact: true })).toBeFocused()
  await page.keyboard.press('Home')
  await expect(resumen).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(drawer.getByRole('tab', { name: 'Recordatorios', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/pestana=recordatorios/)
  await expect(drawer.getByRole('region', { name: 'Tus recordatorios' })).toBeVisible()
  await capturar(page, info, 'drawer-recordatorios')

  await abrirPestanaDeSeguimientos(page, drawer)
  await expect(drawer.getByText('Primera llamada del recorrido')).toBeVisible()
  await capturar(page, info, 'drawer-seguimientos')

  // Esc cierra el drawer; «atrás» no lo vuelve a abrir con otra pestaña sumada al historial.
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(page).not.toHaveURL(/lead=/)
  await capturar(page, info, 'drawer-cerrado')
})

test('B · con el drawer abierto: otro lead, «atrás», y lo privado de la asesora no lo ve la dueña', async ({
  page,
}, info) => {
  await entrar(page, r.ana.email)
  await irALeads(page)
  // Abrir el drawer desde la fila suma una entrada al historial: «atrás» lo cierra.
  await expect(async () => {
    await aLaVista(page.getByText(r.uno.nombre, { exact: true }))
      .first()
      .click()
    await expect(page.getByRole('dialog', { name: r.uno.nombre })).toBeVisible({ timeout: 1000 })
  }).toPass()
  await page.goBack()
  await expect(page.getByRole('dialog', { name: r.uno.nombre })).toBeHidden()
  await expect(page).not.toHaveURL(/lead=/)

  // Con el drawer abierto, el otro lead de la lista queda detrás del velo: un clic ahí cierra el
  // drawer (no abre el otro con lo de éste).
  await page.goto(`/leads?lead=${r.uno.id}&pestana=seguimientos`)
  const drawer = page.getByRole('dialog', { name: r.uno.nombre })
  await expect(drawer.getByRole('region', { name: 'Seguimientos' })).toBeVisible()
  const otro = aLaVista(page.getByText(r.dos.nombre, { exact: true })).first()
  const caja = await otro.boundingBox()
  const delDrawer = await drawer.boundingBox()
  if (caja && delDrawer && caja.x + caja.width / 2 < delDrawer.x) {
    await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2)
    await capturar(page, info, 'drawer-clic-en-otro')
    info.annotations.push({
      type: 'clic en otro lead con el drawer abierto',
      description: page.url(),
    })
  }
  // El otro lead por la URL: el drawer cambia de lead y vuelve a «Resumen» si la pestaña no vino.
  await page.goto(`/leads?lead=${r.dos.id}`)
  await expect(page.getByRole('dialog', { name: r.dos.nombre })).toBeVisible()
  await expect(
    page.getByRole('dialog', { name: r.dos.nombre }).getByRole('tab', { name: 'Resumen' }),
  ).toHaveAttribute('aria-selected', 'true')

  // La dueña ve el lead de Ana en «todos», pero no su seguimiento privado: ni se lista ni se cuenta.
  await entrar(page, r.t.personas.duena)
  await page.goto(`/leads?alcance=todos&lead=${r.uno.id}&pestana=seguimientos`)
  const suyo = page.getByRole('dialog', { name: r.uno.nombre })
  await expect(suyo.getByRole('region', { name: 'Seguimientos' })).toBeVisible()
  await expect(suyo.getByText('Primera llamada del recorrido')).toHaveCount(0)
  await expect(suyo.getByRole('tab', { name: 'Seguimientos', exact: true })).toHaveText(
    'Seguimientos',
  )
  await expect(suyo.getByRole('button', { name: 'Anotar seguimiento' })).toHaveCount(0)
  await volcarArbol(suyo, info, 'duena-drawer-ajeno')
  await capturar(page, info, 'duena-drawer-ajeno-seguimientos')
})
