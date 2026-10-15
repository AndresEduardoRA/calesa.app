import { expect, test } from '@playwright/test'
import { Teclado, abrirConN, dialogo, entrar } from './soporte/alta'
import { cerrarPanelDeFiltros, panelDeFiltros } from './soporte/inventario'
import { crearLead } from './soporte/leads'
import { mandarAlLimbo, telefonoAlAzar } from './soporte/leads-alta'
import {
  AJENO_CARLOS,
  CI_DE_CARLOS,
  PROPIO_BERTA,
  activarCampo,
  buscar,
  cursorHacia,
  fila,
  filas,
  irALeads,
  limpiarListado,
  nombre,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { vistasDe } from './soporte/vehiculos'

// Los filtros del layout, las vistas guardadas, el drawer rápido y la paginación del listado de
// leads. Quién ve qué, los privados y la búsqueda van en `leads-listado.spec.ts`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const telefonoNuevo = () => `${t.codigo}${telefonoAlAzar()}`

test('los filtros del layout filtran, y un campo con muchas opciones se busca dentro', async ({
  page,
}) => {
  await entrar(page, t.personas.duena)
  await irALeads(page, '?alcance=todos')
  await expect(fila(page, PROPIO_BERTA)).toBeVisible()
  await expect(fila(page, AJENO_CARLOS)).toBeVisible()

  const panel = await panelDeFiltros(page)
  await panel.getByLabel('Color E2E').fill('azul')
  await cerrarPanelDeFiltros(page)
  await expect(page).toHaveURL(/a\.e2e_color=azul/)
  await expect(fila(page, AJENO_CARLOS)).toBeVisible()
  await expect(fila(page, PROPIO_BERTA)).toHaveCount(0)

  // La ciudad tiene 60 opciones: se busca dentro y se elige una.
  await irALeads(page, '?alcance=todos')
  const otra = await panelDeFiltros(page)
  const buscador = otra.getByRole('searchbox', { name: 'Buscar en Ciudad de nacimiento E2E' })
  await expect(buscador).toBeVisible()
  await buscador.fill('Ciudad E2E 42')
  await otra.getByRole('checkbox', { name: 'Ciudad E2E 42' }).check()
  await cerrarPanelDeFiltros(page)
  await expect(page).toHaveURL(/a\.e2e_ciudad=op_42/)
  await expect(fila(page, AJENO_CARLOS)).toBeVisible()
  await expect(fila(page, PROPIO_BERTA)).toHaveCount(0)
})

test('recargar conserva el modo, los filtros y la búsqueda', async ({ page }) => {
  await entrar(page, t.personas.duena)
  await irALeads(page, `?alcance=todos&a.e2e_color=azul&tipo=prospecto&${buscar('Ajeno').slice(1)}`)
  await expect(fila(page, AJENO_CARLOS)).toBeVisible()
  await page.reload()
  await expect(page).toHaveURL(/alcance=todos/)
  await expect(page).toHaveURL(/a\.e2e_color=azul/)
  await expect(page.getByRole('button', { name: 'Todos', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(fila(page, AJENO_CARLOS)).toBeVisible()
  await expect(fila(page, PROPIO_BERTA)).toHaveCount(0)
  await expect(
    page.getByRole('list', { name: 'Filtros activos' }).getByText(/Color E2E/),
  ).toBeVisible()
})

test('una vista guardada vuelve a poner sus filtros, y si el campo se apagó lo dice', async ({
  page,
}) => {
  await entrar(page, t.personas.duena)
  await irALeads(page, '?alcance=todos&a.e2e_color=azul')
  await expect(fila(page, AJENO_CARLOS)).toBeVisible()
  await page.getByRole('button', { name: 'Vistas' }).click()
  await page.getByLabel('Guardar los filtros de ahora').fill('Azules E2E')
  await page.getByRole('button', { name: 'Guardar vista' }).click()
  await expect(page.getByText('Vista «Azules E2E» guardada')).toBeVisible()
  expect(await vistasDe(t.personas.duena)).toContainEqual({
    nombre: 'Azules E2E',
    params: { alcance: 'todos', 'a.e2e_color': 'azul' },
  })

  // Aplicarla desde cero la deja como estaba.
  await irALeads(page)
  await page.getByRole('button', { name: 'Vistas' }).click()
  await page.getByRole('button', { name: 'Azules E2E', exact: true }).click()
  await expect(page).toHaveURL(/a\.e2e_color=azul/)
  await expect(fila(page, AJENO_CARLOS)).toBeVisible()
  await expect(fila(page, PROPIO_BERTA)).toHaveCount(0)

  // Se apaga el campo: el filtro se descarta, el resultado no se filtra por él y lo dice.
  await activarCampo('e2e_color', false)
  try {
    await irALeads(page)
    await page.getByRole('button', { name: 'Vistas' }).click()
    await page.getByRole('button', { name: 'Azules E2E', exact: true }).click()
    await expect(
      page.getByText('Se quitó el filtro «Color E2E»: ese campo está desactivado.'),
    ).toBeVisible()
    await expect(fila(page, PROPIO_BERTA)).toBeVisible()
    await expect(fila(page, AJENO_CARLOS)).toBeVisible()
    await page.getByRole('button', { name: 'Entendido' }).click()
    await expect(page).not.toHaveURL(/a\.e2e_color/)
    await expect(page.getByText(/Se quitó el filtro/)).toHaveCount(0)
  } finally {
    await activarCampo('e2e_color', true)
  }

  // Un campo que ya no existe.
  await irALeads(page, '?a.e2e_fantasma=1')
  await expect(page.getByText('Se quitó un filtro de un campo que ya no existe.')).toBeVisible()
})

test('el drawer rápido: se abre en la URL, es de sólo lectura y sobrevive a recargar', async ({
  page,
}) => {
  await entrar(page, t.personas.duena)
  await irALeads(page, '?alcance=todos')
  await fila(page, AJENO_CARLOS).click()
  const drawer = page.getByRole('dialog', { name: nombre(AJENO_CARLOS) })
  await expect(drawer).toBeVisible()
  await expect(page).toHaveURL(/lead=/)
  // Lo que le llega a quien mira: el color sí, la cédula no, el teléfono enmascarado.
  await expect(drawer.getByText('azul')).toBeVisible()
  await expect(drawer.getByText('Color E2E')).toBeVisible()
  await expect(drawer.getByText('Cédula E2E')).toHaveCount(0)
  await expect(drawer).not.toContainText(CI_DE_CARLOS)
  await expect(drawer).not.toContainText(t.telefonoDeCarlos)
  await expect(drawer).toContainText('•')
  await expect(drawer.getByText('Algunos datos son solo de su cartera.')).toBeVisible()
  // Sólo lectura: el único enlace es «Abrir ficha», a la ficha de ese lead.
  const enlaces = drawer.getByRole('link')
  await expect(enlaces).toHaveCount(1)
  await expect(enlaces.first()).toHaveText('Abrir ficha')
  await expect(enlaces.first()).toHaveAttribute('href', /\/leads\/[0-9a-f-]{36}$/)

  await page.reload()
  await expect(page.getByRole('dialog', { name: nombre(AJENO_CARLOS) })).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click()
  await expect(page).not.toHaveURL(/lead=/)
  await expect(page.getByRole('dialog', { name: nombre(AJENO_CARLOS) })).toHaveCount(0)

  // Un id que no es de nadie dice lo mismo que uno que ya no se ve.
  await page.goto('/leads?lead=00000000-0000-4000-8000-000000000000')
  await expect(
    page
      .getByRole('dialog', { name: 'Lead no disponible' })
      .getByText('Este lead ya no está disponible: no existe o ya no tienes acceso.'),
  ).toBeVisible()
})

test('si le quitan el acceso con el drawer abierto, lo dice al volver', async ({ page }) => {
  const telefono = telefonoNuevo()
  const id = await crearLead({
    nombre: 'Revocable',
    telefono,
    deQuien: t.personas.berta,
    atributos: { e2e_color: 'verde' },
  })
  await entrar(page, t.personas.berta)
  await irALeads(page)
  await fila(page, 'Revocable').click()
  const drawer = page.getByRole('dialog', { name: nombre('Revocable') })
  await expect(drawer.getByText('verde')).toBeVisible()

  // Mientras tanto, el lead deja de ser suyo (se revoca su acceso y queda en el limbo).
  await mandarAlLimbo(id)
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('focus'))
  })
  await expect(page.getByText('Este lead ya no está disponible')).toBeVisible()
  await expect(drawer.getByText('verde')).toHaveCount(0)
})

test('el lead que crea el alta aparece en la lista', async ({ page }) => {
  const nacional = telefonoAlAzar()
  const corto = 'Alta al listado'
  await entrar(page, t.personas.duena)
  await irALeads(page)
  const teclado = new Teclado(page)
  await abrirConN(page, teclado)
  const panel = dialogo(page)
  await panel.getByLabel('Teléfono principal').fill(nacional)
  await panel.getByLabel('Nombre').fill(nombre(corto))
  await teclado.pulsar('Control+Enter')
  await panel.getByLabel('Resumen').fill('Primer contacto')
  await teclado.pulsar('Control+Enter')
  await expect(page.getByText(/Lead #\d+ creado/)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialogo(page)).toBeHidden()
  await expect(fila(page, corto)).toBeVisible()
})

test('paginación: la última página, un cursor repetido, uno vacío y uno ilegible', async ({
  page,
}) => {
  test.setTimeout(180_000)
  // Carlos ve sólo lo suyo: su lead de antes y 50 más hacen 51 (50 y 1). Los de limbo y papelera
  // no cuentan porque no son suyos para nadie.
  for (let i = 1; i <= 50; i += 1) {
    await crearLead({
      nombre: `Paginado ${String(i).padStart(2, '0')}`,
      telefono: telefonoNuevo(),
      deQuien: t.personas.carlos,
    })
  }
  await entrar(page, t.personas.carlos)
  await irALeads(page)
  await expect(filas(page)).toHaveCount(50)
  // El más viejo (el primero que se creó) queda para la segunda página.
  await expect(fila(page, AJENO_CARLOS)).toHaveCount(0)
  const siguiente = page.getByRole('link', { name: 'Siguiente' })
  await expect(siguiente).toBeVisible()

  await siguiente.click()
  await expect(page).toHaveURL(/cursor=/)
  await expect(filas(page)).toHaveCount(1)
  await expect(fila(page, AJENO_CARLOS)).toBeVisible()
  // Última página: no hay más hacia adelante.
  await expect(
    page
      .locator('nav[aria-label="Páginas"] [aria-disabled="true"]')
      .filter({ hasText: 'Siguiente' }),
  ).toBeVisible()
  const segunda = page.url()

  // El mismo cursor, otra vez y recargando, da lo mismo.
  await page.reload()
  await expect(filas(page)).toHaveCount(1)
  await page.goto(segunda)
  await expect(filas(page)).toHaveCount(1)
  await expect(fila(page, AJENO_CARLOS)).toBeVisible()

  await page.getByRole('link', { name: 'Anterior' }).click()
  await expect(filas(page)).toHaveCount(50)

  // Un cursor más allá del final: una página vacía con salida, no un vacío sin explicación.
  const pasado = cursorHacia(
    '1999-01-01T00:00:00.000000+00:00',
    '00000000-0000-4000-8000-000000000000',
    'siguiente',
  )
  await irALeads(page, `?cursor=${pasado}`)
  await expect(page.getByText('No hay más en esta página')).toBeVisible()
  await page.getByRole('link', { name: 'Volver al principio' }).click()
  await expect(page).not.toHaveURL(/cursor=/)
  await expect(filas(page)).toHaveCount(50)

  // Un cursor ilegible es la primera página.
  await irALeads(page, '?cursor=basura')
  await expect(filas(page)).toHaveCount(50)
})
