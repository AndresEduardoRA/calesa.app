import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { aLaVista, otraPersona } from './soporte/inventario'
import { sesionDe } from './soporte/leads-alta'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { irAFicha, nuevoLead, tituloDeLaFicha } from './soporte/leads-ficha'
import {
  delLead,
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import {
  abrirSelectorEnLaFicha,
  crearEtiquetaDe,
  dialogoDeEtiquetas,
  etiquetasDe,
  marcasEnLaBase,
  menuDeFila,
  ponerEtiquetaDe,
  selectorDeEtiquetas,
} from './soporte/leads-marcas'

// Las etiquetas de una persona: se crean desde el selector de la ficha escribiendo y con Enter, se
// renombran, recolorean y eliminan en «Gestionar etiquetas» (`?panel=etiquetas`), con versión
// (conflicto legible entre dos pestañas) y confirmación que dice a cuántos leads tocan.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

async function leadDeBerta(corto: string) {
  return nuevoLead({ corto, telefono: completoCon(t, nacional()), deQuien: t.personas.berta })
}

test('crear con Enter desde el selector la pone en el lead; Enter sobre una que existe la quita', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Etq Crear ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()

  const selector = await abrirSelectorEnLaFicha(page)
  await expect(selector.getByText('Solo las ves tú.')).toBeVisible()
  const campo = selector.getByLabel('Buscar o crear una etiqueta')
  await campo.fill('Llamar el lunes')
  await expect(selector.getByText('Crear «Llamar el lunes»')).toBeVisible()
  await campo.press('Enter')
  await expect
    .poll(() => marcasEnLaBase(lead.id, t.personas.berta))
    .toMatchObject({
      etiquetas: ['Llamar el lunes'],
    })
  const cabecera = page.locator('header').filter({ has: page.getByRole('heading', { level: 1 }) })
  await expect(cabecera.getByText('Llamar el lunes', { exact: true })).toBeVisible()

  // Con otras mayúsculas no se ofrece crear: es la misma, y Enter la quita del lead.
  await campo.fill('LLAMAR EL LUNES')
  await expect(selector.getByText(/^Crear «/)).toHaveCount(0)
  await campo.press('Enter')
  await expect
    .poll(() => marcasEnLaBase(lead.id, t.personas.berta))
    .toMatchObject({ etiquetas: [] })
  expect((await etiquetasDe(t.personas.berta)).map((e) => e.nombre)).toContain('Llamar el lunes')

  // La base también lo rechaza si alguien lo intenta por su cuenta.
  const sesion = await sesionDe(t.personas.berta, CONTRASENA)
  const { error } = await sesion.rpc('etiqueta_crear', {
    p_id: crypto.randomUUID(),
    p_nombre: 'llamar EL lunes',
  })
  expect(error?.message).toBe('Ya tienes una etiqueta «Llamar el lunes».')
})

test('renombrar y recolorear en «Gestionar»; con una versión vieja, el conflicto se dice y se relee', async ({
  page,
  browser,
}, info) => {
  const lead = await leadDeBerta(`Etq Gestionar ${info.project.name}`)
  const id = await crearEtiquetaDe(t.personas.berta, `Vieja ${info.project.name}`, 'gris')
  await ponerEtiquetaDe(t.personas.berta, lead.id, id)
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id, '?panel=etiquetas')
  const dialogo = dialogoDeEtiquetas(page)
  await expect(dialogo).toBeVisible()
  const nombreViejo = dialogo.getByLabel(`Nombre de la etiqueta Vieja ${info.project.name}`)
  await expect(nombreViejo).toBeVisible()
  await expect(dialogo.getByText('En 1 lead')).toBeVisible()

  // Otra pestaña la tiene abierta con la misma versión.
  const otra = await otraPersona(browser, page)
  await entrar(otra, t.personas.berta)
  await irAFicha(otra, lead.id, '?panel=etiquetas')
  const enLaOtra = dialogoDeEtiquetas(otra).getByLabel(
    `Nombre de la etiqueta Vieja ${info.project.name}`,
  )
  await expect(enLaOtra).toBeVisible()

  await nombreViejo.fill(`Nueva ${info.project.name}`)
  await nombreViejo.press('Enter')
  await expect
    .poll(async () => (await etiquetasDe(t.personas.berta)).map((e) => e.nombre))
    .toContain(`Nueva ${info.project.name}`)
  await dialogo.getByRole('button', { name: /^Color de Nueva/ }).click()
  await page.getByRole('menuitemradio', { name: 'Violeta' }).click()
  await expect
    .poll(async () => (await etiquetasDe(t.personas.berta)).find((e) => e.id === id)?.color)
    .toBe('violeta')

  // En la otra pestaña, con la versión vieja: conflicto legible, y lo escrito no se pierde.
  await enLaOtra.fill(`Otra ${info.project.name}`)
  await enLaOtra.press('Enter')
  await expect(
    aLaVista(otra.getByText(/^Cambiaste esta etiqueta .* desde otra ventana/)).first(),
  ).toBeVisible()
  await expect(
    dialogoDeEtiquetas(otra).getByLabel(`Nombre de la etiqueta Nueva ${info.project.name}`),
  ).toBeVisible()
  await otra.context().close()

  // La ficha la muestra con su nombre nuevo.
  await page.keyboard.press('Escape')
  const cabecera = page.locator('header').filter({ has: page.getByRole('heading', { level: 1 }) })
  await expect(cabecera.getByText(`Nueva ${info.project.name}`, { exact: true })).toBeVisible()
})

test('eliminar una en uso pide confirmar diciendo a cuántos toca; sin leads se deshace; dos pestañas no fallan', async ({
  page,
  browser,
}, info) => {
  const lead = await leadDeBerta(`Etq Eliminar ${info.project.name}`)
  const enUso = `En uso ${info.project.name}`
  const suelta = `Suelta ${info.project.name}`
  const id = await crearEtiquetaDe(t.personas.berta, enUso)
  await crearEtiquetaDe(t.personas.berta, suelta)
  await ponerEtiquetaDe(t.personas.berta, lead.id, id)
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id, '?panel=etiquetas')
  const dialogo = dialogoDeEtiquetas(page)
  await expect(dialogo.getByLabel(`Nombre de la etiqueta ${enUso}`)).toBeVisible()

  const otra = await otraPersona(browser, page)
  await entrar(otra, t.personas.berta)
  await irAFicha(otra, lead.id, '?panel=etiquetas')
  await expect(dialogoDeEtiquetas(otra).getByLabel(`Nombre de la etiqueta ${enUso}`)).toBeVisible()

  await dialogo.getByRole('button', { name: `Eliminar la etiqueta ${enUso}` }).click()
  await expect(
    dialogo.getByText(`¿Eliminar «${enUso}»? Se quita de 1 lead. No se puede deshacer.`),
  ).toBeVisible()
  await dialogo.getByRole('button', { name: 'Eliminar', exact: true }).click()
  await expect(dialogo.getByLabel(`Nombre de la etiqueta ${enUso}`)).toHaveCount(0)
  await expect
    .poll(() => marcasEnLaBase(lead.id, t.personas.berta))
    .toMatchObject({ etiquetas: [] })

  // La otra pestaña todavía la muestra: eliminarla allí no falla, dice que ya no estaba.
  const enLaOtra = dialogoDeEtiquetas(otra)
  await enLaOtra.getByRole('button', { name: `Eliminar la etiqueta ${enUso}` }).click()
  await enLaOtra.getByRole('button', { name: 'Eliminar', exact: true }).click()
  await expect(
    aLaVista(otra.getByText('Esa etiqueta ya no estaba: la eliminaste en otra ventana.')),
  ).toBeVisible()
  await otra.context().close()

  // Sin leads: se elimina enseguida y «Deshacer» la trae con el mismo id.
  const antes = (await etiquetasDe(t.personas.berta)).find((e) => e.nombre === suelta)
  await dialogo.getByRole('button', { name: `Eliminar la etiqueta ${suelta}` }).click()
  await expect(aLaVista(page.getByText('Etiqueta eliminada.'))).toBeVisible()
  await aLaVista(page.getByRole('button', { name: 'Deshacer', exact: true })).click()
  await expect
    .poll(async () => (await etiquetasDe(t.personas.berta)).find((e) => e.nombre === suelta)?.id)
    .toBe(antes?.id)
})

test('las insignias se leen en modo oscuro', async ({ page }, info) => {
  const lead = await leadDeBerta(`Etq Oscuro ${info.project.name}`)
  const nombreDeLaEtiqueta = `Oscura ${info.project.name}`
  const id = await crearEtiquetaDe(t.personas.berta, nombreDeLaEtiqueta, 'azul')
  await ponerEtiquetaDe(t.personas.berta, lead.id, id)
  await page.emulateMedia({ colorScheme: 'dark' })
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id)
  const cabecera = page.locator('header').filter({ has: page.getByRole('heading', { level: 1 }) })
  const pastilla = cabecera.getByText(nombreDeLaEtiqueta, { exact: true }).locator('..')
  await expect(pastilla).toBeVisible()
  await expect(page.locator('html')).toHaveClass(/dark/)
  // Los tokens del tema oscuro (`--etiqueta-azul-soft` e `-ink`).
  await expect(pastilla).toHaveCSS('background-color', 'rgb(34, 45, 79)')
  await expect(pastilla).toHaveCSS('color', 'rgb(169, 187, 255)')
})

test('desde el «⋯» de la fila, «Etiquetas…» abre el selector y la etiqueta aparece en la fila, todo con el teclado', async ({
  page,
}, info) => {
  const corto = `Etq Fila ${info.project.name}`
  const lead = await leadDeBerta(corto)
  const nombreDeLaEtiqueta = `Fila ${info.project.name}`
  await crearEtiquetaDe(t.personas.berta, nombreDeLaEtiqueta)
  await entrar(page, t.personas.berta)
  await irALeads(page)

  // Con el teclado: el «⋯» se abre con Enter, se baja con las flechas y se elige con Enter.
  const boton = menuDeFila(page, corto)
  await expect(boton).toBeVisible()
  await boton.focus()
  const menu = page.getByRole('menu')
  await expect(async () => {
    await page.keyboard.press('Enter')
    await expect(menu).toBeVisible({ timeout: 1000 })
  }).toPass()
  await menu.getByRole('menuitem', { name: 'Etiquetas…' }).focus()
  await page.keyboard.press('Enter')
  const selector = selectorDeEtiquetas(page)
  await expect(selector).toBeVisible()
  await expect(selector.getByLabel('Buscar o crear una etiqueta')).toBeFocused()
  await page.keyboard.type(nombreDeLaEtiqueta)
  await page.keyboard.press('Enter')
  await expect
    .poll(() => marcasEnLaBase(lead.id, t.personas.berta))
    .toMatchObject({
      etiquetas: [nombreDeLaEtiqueta],
    })
  await page.keyboard.press('Escape')
  await expect(selector).toBeHidden()
  await expect(delLead(page, corto).getByText(nombreDeLaEtiqueta, { exact: true })).toBeVisible()
  await expect(page).not.toHaveURL(/[?&]lead=/)
})
