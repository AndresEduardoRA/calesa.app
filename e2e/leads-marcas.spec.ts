import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { aLaVista, otraPersona } from './soporte/inventario'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { irAFicha, nuevoLead, tituloDeLaFicha, versionDe } from './soporte/leads-ficha'
import {
  delLead,
  irALeads,
  limpiarListado,
  nombre,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import {
  abrirMenuDeFila,
  esperarMarcaEnLaFicha,
  marcarEnLaFicha,
  marcasEnLaBase,
  menuDeFila,
  ponerMarcaDe,
} from './soporte/leads-marcas'

// Favorito y tachado: en el «⋯» de la cabecera de la ficha (casillas con `aria-checked`) y en el «⋯» de
// cada fila del listado. Son de quien mira: otra persona que ve el mismo lead no los ve. No mueven
// la versión del lead. El drawer los muestra sin acciones.
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

test('favorito y tachado desde el «⋯» de la ficha: siguen al recargar y no mueven la versión', async ({
  page,
  browser,
}, info) => {
  const lead = await leadDeBerta(`Marca Ficha ${info.project.name}`)
  const version = await versionDe(lead.id)
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()

  await esperarMarcaEnLaFicha(page, 'Favorito', false)
  // Doble clic: el segundo llega mientras viaja el primero y no lo deja al revés.
  await marcarEnLaFicha(page, 'Favorito', { doble: true })
  await esperarMarcaEnLaFicha(page, 'Favorito', true)
  await marcarEnLaFicha(page, 'Tachado')
  await esperarMarcaEnLaFicha(page, 'Tachado', true)
  await expect(aLaVista(page.getByText('Lead tachado.'))).toBeVisible()
  await expect
    .poll(() => marcasEnLaBase(lead.id, t.personas.berta))
    .toEqual({
      favorito: true,
      tachado: true,
      etiquetas: [],
    })

  await page.reload()
  await esperarMarcaEnLaFicha(page, 'Favorito', true)
  await esperarMarcaEnLaFicha(page, 'Tachado', true)
  expect(await versionDe(lead.id)).toBe(version)

  // La dueña ve el mismo lead («todos») sin las marcas de Berta.
  const otra = await otraPersona(browser, page)
  await entrar(otra, t.personas.duena)
  await irAFicha(otra, lead.id)
  await esperarMarcaEnLaFicha(otra, 'Favorito', false)
  await esperarMarcaEnLaFicha(otra, 'Tachado', false)
  await otra.context().close()

  // Quitar: lo mismo con el valor contrario.
  await marcarEnLaFicha(page, 'Tachado')
  await esperarMarcaEnLaFicha(page, 'Tachado', false)
  await expect
    .poll(async () => (await marcasEnLaBase(lead.id, t.personas.berta)).tachado)
    .toBe(false)
})

test('el «⋯» de la fila marca sin abrir el drawer, y el drawer muestra las marcas (se cambian en su «⋯»)', async ({
  page,
}, info) => {
  const corto = `Marca Fila ${info.project.name}`
  const lead = await leadDeBerta(corto)
  await entrar(page, t.personas.berta)
  await irALeads(page)

  const menu = await abrirMenuDeFila(page, corto)
  await menu.getByRole('menuitemcheckbox', { name: 'Favorito' }).click()
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Favorito' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.keyboard.press('Escape')
  await expect(page).not.toHaveURL(/[?&]lead=/)
  await expect
    .poll(async () => (await marcasEnLaBase(lead.id, t.personas.berta)).favorito)
    .toBe(true)
  await expect(delLead(page, corto).getByText('Favorito', { exact: true })).toBeAttached()

  // El drawer: lo dice (las insignias son de lectura; se cambian en su «⋯»).
  await aLaVista(page.getByRole('button', { name: `Abrir ${nombre(corto)}` }))
    .first()
    .click()
  const drawer = page.getByRole('dialog', { name: nombre(corto) })
  await expect(drawer).toBeVisible()
  await expect(drawer.getByText('Favorito', { exact: true })).toBeAttached()
  await expect(drawer.getByRole('button', { name: 'Favorito' })).toHaveCount(0)
})

test('tachar desde el «⋯» ofrece «Deshacer», y una marca puesta en otra pestaña aparece al volver', async ({
  page,
}, info) => {
  const corto = `Marca Volver ${info.project.name}`
  const lead = await leadDeBerta(corto)
  await entrar(page, t.personas.berta)
  await irALeads(page)
  const menu = await abrirMenuDeFila(page, corto)
  await menu.getByRole('menuitemcheckbox', { name: 'Tachado' }).click()
  await expect(aLaVista(page.getByText('Lead tachado.'))).toBeVisible()
  await expect
    .poll(async () => (await marcasEnLaBase(lead.id, t.personas.berta)).tachado)
    .toBe(true)
  await aLaVista(page.getByRole('button', { name: 'Deshacer', exact: true })).click()
  await expect
    .poll(async () => (await marcasEnLaBase(lead.id, t.personas.berta)).tachado)
    .toBe(false)
  await expect(menuDeFila(page, corto)).toBeVisible()

  // Otra pestaña (la misma persona) lo marca favorito: al volver a esta, la fila lo dice.
  await ponerMarcaDe(t.personas.berta, lead.id, 'favorito')
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(delLead(page, corto).getByText('Favorito', { exact: true })).toBeAttached()
})
