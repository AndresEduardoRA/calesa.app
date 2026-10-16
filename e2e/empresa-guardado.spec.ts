import { expect, test, type Locator, type Page } from './soporte/prueba'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import {
  restaurarEmpresa,
  tomarInstantaneaDeEmpresa,
  type InstantaneaDeEmpresa,
} from './soporte/empresa'
import { ingresar } from './soporte/pasos'

// Guardar los ajustes de la empresa sin perder lo que se teclea alrededor: la pantalla se vuelve a
// dibujar con lo guardado (el formulario se reemplaza) y lo tipeado tiene que sobrevivir. La empresa
// es una fila única: se deja exactamente como estaba, para el spec que sigue en la misma corrida.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'

let duena = ''
let antes: InstantaneaDeEmpresa

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  antes = await tomarInstantaneaDeEmpresa()
  await restaurarEmpresa()
  duena = correoDePrueba(`duena-empresa-guardado-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Prueba' })
})

test.afterAll(async () => {
  await restaurarEmpresa(antes)
  await borrarPersonasDePrueba()
})

async function entrar(page: Page, correo: string) {
  await page.goto('/ingreso')
  await ingresar(page, correo, CLAVE)
  await expect(page).toHaveURL('/')
}

// Tras «Guardar» la pantalla se vuelve a dibujar con lo guardado (el formulario se reemplaza), y el
// aviso «guardados» sale antes. Con la CPU frenada esa ventana se agranda: lo que se teclea justo
// al aparecer el aviso tiene que quedar en el formulario que se ve, y sobrevivir a recargar.
test('guardar con la pantalla lenta no pierde lo que se teclea apenas aparece el aviso', async ({
  page,
  context,
}, info) => {
  test.skip(
    info.project.name !== 'escritorio',
    'El freno de CPU va por CDP: sólo Chromium de escritorio.',
  )
  await entrar(page, duena)
  await page.goto('/configuracion/empresa')
  await page.getByLabel('Razón social').fill(`Lenta ${Date.now()} SRL`)

  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 20 })
  try {
    await page.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(page.getByText('Ajustes de la empresa guardados')).toBeVisible()
    await page.getByLabel('NIT').fill('5060708090')
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  }
  await expect(page.getByLabel('NIT')).toHaveValue('5060708090')
  await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeEnabled()

  await page.reload()
  await expect(page.getByText('Recuperamos lo que habías escrito')).toBeVisible()
  await expect(page.getByLabel('NIT')).toHaveValue('5060708090')
})

// El orden de los eventos, fijo: el servidor responde cuando la prueba quiere. Mientras guarda, el
// formulario que se ve es el viejo y está a punto de reemplazarse con lo guardado: no se puede teclear
// en él (una tecla ahí iría a un campo que desaparece). Al llegar lo guardado, el formulario nuevo se
// edita, y lo que se teclea en él sobrevive a recargar.
test('mientras guarda no se puede teclear, y al llegar lo guardado sí', async ({ page }) => {
  await entrar(page, duena)
  await page.goto('/configuracion/empresa')
  await page.getByLabel('Razón social').fill(`Demora ${Date.now()} SRL`)

  let soltar = () => {}
  const retenida = new Promise<void>((resolver) => {
    soltar = resolver
  })
  await page.route(
    (url) => url.pathname === '/configuracion/empresa',
    async (ruta) => {
      if (ruta.request().method() === 'POST' && 'next-action' in ruta.request().headers()) {
        await retenida
      }
      await ruta.fallback()
    },
  )
  try {
    await page.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Guardando…' })).toBeVisible()
    await expect(page.getByLabel('NIT')).toBeDisabled()
    await expect(page.getByLabel('Razón social')).toBeDisabled()
  } finally {
    soltar()
  }
  await expect(page.getByText('Ajustes de la empresa guardados')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeEnabled()
  await expect(page.getByLabel('NIT')).toBeEnabled()

  await page.getByLabel('NIT').fill('7070707070')
  await expect(page.getByLabel('NIT')).toHaveValue('7070707070')
  await page.reload()
  await expect(page.getByText('Recuperamos lo que habías escrito')).toBeVisible()
  await expect(page.getByLabel('NIT')).toHaveValue('7070707070')
})

// Un aviso es de paso: no puede tapar lo que la persona acaba de usar. Tras guardar, el pie del panel
// («Cerrar», «Guardar») queda justo donde sale el aviso. Se mide con el navegador, sin depender de la
// carga: en el centro de cada botón, quién recibe el clic (`elementFromPoint`).
async function quieto(aviso: Locator) {
  let anterior = ''
  await expect
    .poll(async () => {
      const ahora = JSON.stringify(await aviso.boundingBox())
      const igual = ahora === anterior
      anterior = ahora
      return igual
    })
    .toBe(true)
}

async function recibeElClic(boton: Locator): Promise<boolean> {
  await boton.scrollIntoViewIfNeeded()
  return boton.evaluate((el) => {
    const caja = el.getBoundingClientRect()
    const arriba = document.elementFromPoint(caja.x + caja.width / 2, caja.y + caja.height / 2)
    return arriba !== null && el.contains(arriba)
  })
}

test('los avisos no tapan los botones del panel, y su acción se pulsa', async ({ page }) => {
  await entrar(page, duena)
  await page.goto('/configuracion/empresa?seccion=monedas')
  await page.getByRole('button', { name: /^Oficial/ }).click()
  const panel = page.getByRole('dialog')
  await expect(panel.getByRole('heading', { name: 'Oficial' })).toBeVisible()

  // Dos avisos apilados, con la animación de entrada terminada.
  const avisos = page.locator('[data-sonner-toast]')
  for (const valor of ['7,50', '7,51']) {
    // Con Enter, no con el puntero: el primer aviso ya está sobre el botón.
    await panel.getByLabel(/^Valor/).fill(valor)
    await panel.getByLabel(/^Valor/).press('Enter')
    await expect(avisos.filter({ hasText: 'Oficial' })).toHaveCount(valor === '7,50' ? 1 : 2)
  }
  for (const aviso of await avisos.all()) {
    await quieto(aviso)
  }

  // Lo de abajo del panel recibe el clic, no el aviso.
  expect(await recibeElClic(panel.getByRole('button', { name: 'Cerrar' }).first())).toBe(true)
  expect(await recibeElClic(panel.getByRole('button', { name: 'Guardar' }))).toBe(true)

  // Y con el teclado: Escape cierra el panel con los avisos abiertos.
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()

  // Un aviso con acción sigue pulsable: lo tipeado y sin guardar se recupera, y se puede descartar.
  await page.goto('/configuracion/empresa')
  await page.getByLabel('NIT').fill('9090909090')
  await page.reload()
  const recuperado = page.locator('[data-sonner-toast]').filter({ hasText: 'Recuperamos' })
  await expect(recuperado).toBeVisible()
  await quieto(recuperado)
  const descartar = recuperado.getByRole('button', { name: 'Descartar' })
  expect(await recibeElClic(descartar)).toBe(true)
  await descartar.click()
  await expect(page.getByLabel('NIT')).toHaveValue('')
})
