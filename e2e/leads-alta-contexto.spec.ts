import { entrar, dialogo, limpiarAlta, prepararAlta, type PersonasDelAlta } from './soporte/alta'
import {
  borrarOrigenesDePrueba,
  PREFIJO_DE_ORIGEN_E2E,
  abrirOrigenes,
  modalDeOrigen,
} from './soporte/origenes-de-lead'
import { descartarAviso } from './soporte/inventario'
import { capturar } from './soporte/recorrido'
import { expect, test, type Page, type Route } from './soporte/prueba'
import { sql } from './soporte/sql'

// 5b-3: «Nuevo lead» lee lo que necesita (los orígenes, los tipos de lead y de seguimiento, el último origen de quien lo abre y el layout
// de campos) cuando se pide, no con el documento de cada pantalla. El drawer se abre al instante con su esqueleto; la lectura se adelanta
// cuando el puntero llega al botón o éste toma el foco; si falla, lo dice con «Reintentar» sin cerrarse; y cerrarlo a medias no deja nada
// colgado. Son dos pedidos al navegador (la función `lead_alta_contexto` y la tabla `leads_campos`); la función pide cada catálogo acotado a su
// tope (100 orígenes, 100 tipos de lead y 100 de seguimiento: el de escribir, que pone la base) y lo dice (`topes`; cierra 5b-5).
test.describe.configure({ mode: 'serial' })

const CONTEXTO = '**/rest/v1/rpc/lead_alta_contexto'
const CAMPOS = '**/rest/v1/leads_campos*'
const PREFIJO_DEL_CATALOGO = 'e2e_cat_contexto_'

let personas: PersonasDelAlta
let restaurar = async () => {}

test.beforeAll(async ({}, info) => {
  const terreno = await prepararAlta(`${info.project.name}-contexto`)
  personas = terreno.personas
  restaurar = terreno.restaurarCatalogos
})

test.afterAll(async () => {
  await borrarOrigenesDePrueba()
  await limpiarAlta(restaurar)
})

// El de la barra superior (el listado sin leads tiene el suyo, en su estado vacío).
const botonNuevo = (page: Page) =>
  page.locator('header').getByRole('button', { name: 'Nuevo lead' })
const telefono = (page: Page) => dialogo(page).getByLabel('Teléfono principal')

// Cuenta lo que el navegador le pide a la base para el alta.
function contarPedidos(page: Page) {
  const pedidos = { contexto: 0, campos: 0 }
  page.on('request', (pedido) => {
    if (pedido.url().includes('/rest/v1/rpc/lead_alta_contexto')) pedidos.contexto += 1
    if (pedido.url().includes('/rest/v1/leads_campos')) pedidos.campos += 1
  })
  return pedidos
}

// Cada pedido a la base del alta tarda `ms` más en salir.
async function demorar(page: Page, ms: number) {
  const con = async (ruta: Route) => {
    await new Promise((listo) => setTimeout(listo, ms))
    await ruta.continue().catch(() => undefined)
  }
  await page.route(CONTEXTO, con)
  await page.route(CAMPOS, con)
}

async function aLeads(page: Page) {
  await entrar(page, personas.duena)
  await page.goto('/leads')
  await expect(botonNuevo(page)).toBeVisible()
  await expect(page).toHaveURL(/\/leads/)
}

test('el primer clic con la lectura lenta abre el drawer al instante, con esqueleto, y después el formulario con el foco en el teléfono', async ({
  page,
}, info) => {
  await aLeads(page)
  await demorar(page, 3000)
  const pedidos = contarPedidos(page)
  const inicio = Date.now()
  await botonNuevo(page).click()
  await expect(dialogo(page)).toBeVisible({ timeout: 1500 })
  expect(Date.now() - inicio, 'el drawer no esperó a la lectura').toBeLessThan(2500)
  await expect(dialogo(page).getByLabel('Cargando el formulario')).toBeVisible()
  await capturar(page, info, 'alta-cargando')
  await expect(telefono(page)).toBeFocused({ timeout: 10_000 })
  await capturar(page, info, 'alta-lista')
  expect(pedidos).toEqual({ contexto: 1, campos: 1 })
})

test('con un 500 el drawer sigue abierto, lo dice con «Reintentar», y reintentar lo abre', async ({
  page,
}, info) => {
  await aLeads(page)
  await page.route(CONTEXTO, (ruta) => ruta.fulfill({ status: 500, body: '{"message":"x"}' }))
  await botonNuevo(page).click()
  const panel = dialogo(page)
  await expect(panel.getByText('No se pudo cargar el formulario.')).toBeVisible()
  await expect(panel).toBeVisible()
  await capturar(page, info, 'alta-error-500')
  await page.unroute(CONTEXTO)
  await panel.getByRole('button', { name: 'Reintentar' }).click()
  await expect(telefono(page)).toBeVisible()
  await expect(panel.getByText('No se pudo cargar el formulario.')).toBeHidden()
})

test('con la red caída pasa lo mismo, y un fallo no se guarda: al volver la red, el siguiente clic lee de nuevo', async ({
  page,
}, info) => {
  await aLeads(page)
  await page.route(CONTEXTO, (ruta) => ruta.abort('failed'))
  await page.route(CAMPOS, (ruta) => ruta.abort('failed'))
  await botonNuevo(page).click()
  const panel = dialogo(page)
  await expect(panel.getByText('No se pudo cargar el formulario.')).toBeVisible()
  await capturar(page, info, 'alta-error-sin-red')
  await page.unroute(CONTEXTO)
  await page.unroute(CAMPOS)
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await botonNuevo(page).click()
  await expect(telefono(page)).toBeVisible()
})

test('cerrar antes de que termine no deja nada colgado: ni drawer, ni aviso, ni error, y al reabrir no hay un pedido más', async ({
  page,
}) => {
  const errores: string[] = []
  page.on('pageerror', (e) => errores.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text())
  })
  await aLeads(page)
  await demorar(page, 2500)
  const pedidos = contarPedidos(page)
  await botonNuevo(page).click()
  await expect(dialogo(page).getByLabel('Cargando el formulario')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialogo(page)).toBeHidden()
  await expect(page).not.toHaveURL(/panel=nuevo-lead/)
  // La lectura termina con el drawer ya cerrado: no abre nada ni avisa.
  await page.waitForTimeout(3500)
  await expect(dialogo(page)).toBeHidden()
  await expect(page.getByText('No se pudo cargar el formulario.')).toHaveCount(0)
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0)
  expect(errores).toEqual([])
  // Lo leído quedó: reabrir muestra el formulario sin pedir otra vez.
  await botonNuevo(page).click()
  await expect(telefono(page)).toBeVisible()
  expect(pedidos).toEqual({ contexto: 1, campos: 1 })
})

test('un doble clic abre un solo drawer y lee una vez', async ({ page }) => {
  await aLeads(page)
  await demorar(page, 1000)
  const pedidos = contarPedidos(page)
  await botonNuevo(page).dblclick()
  await expect(dialogo(page)).toHaveCount(1)
  await expect(telefono(page)).toBeVisible({ timeout: 10_000 })
  expect(pedidos).toEqual({ contexto: 1, campos: 1 })
})

test('con el puntero sobre el botón o el foco en él la lectura se adelanta, sin abrir nada', async ({
  page,
}) => {
  await aLeads(page)
  const pedidos = contarPedidos(page)
  await botonNuevo(page).hover()
  await expect.poll(() => pedidos).toEqual({ contexto: 1, campos: 1 })
  await expect(dialogo(page)).toBeHidden()
  await botonNuevo(page).click()
  await expect(telefono(page)).toBeVisible()
  expect(pedidos, 'el clic no vuelve a leer').toEqual({ contexto: 1, campos: 1 })
})

test('con la tecla N también se lee, y el foco llega al teléfono', async ({ page }) => {
  await aLeads(page)
  const pedidos = contarPedidos(page)
  await expect(async () => {
    if (!page.url().includes('panel=nuevo-lead')) await page.keyboard.press('n')
    await expect(dialogo(page)).toBeVisible({ timeout: 1000 })
  }).toPass()
  await expect(telefono(page)).toBeFocused({ timeout: 10_000 })
  expect(pedidos).toEqual({ contexto: 1, campos: 1 })
})

test('un origen creado en Configuración aparece en el alta sin recargar la página', async ({
  page,
}) => {
  await entrar(page, personas.duena)
  await abrirOrigenes(page)
  const pedidos = contarPedidos(page)
  // Se lee una vez (el puntero llega al botón) y queda guardado.
  await botonNuevo(page).hover()
  await expect.poll(() => pedidos.contexto).toBe(1)
  const nuevo = `${PREFIJO_DE_ORIGEN_E2E} contexto ${String(Date.now())}`
  await page.getByRole('button', { name: 'Nuevo origen' }).first().click()
  const modal = modalDeOrigen(page, 'Nuevo origen')
  await modal.getByLabel('Nombre').fill(nuevo)
  await modal.getByRole('button', { name: 'Crear origen' }).click()
  await expect(modal).toBeHidden()
  await descartarAviso(page, 'Origen creado.')
  await botonNuevo(page).click()
  await expect(telefono(page)).toBeVisible()
  await expect(
    dialogo(page).getByLabel('Origen del lead').locator('option', { hasText: nuevo }),
  ).toHaveCount(1)
  expect(pedidos.contexto, 'se volvió a leer tras crear el origen').toBe(2)
})

test('lo que se lee al abrir: dos pedidos, con la semilla y con 100 orígenes, 100 tipos de lead y 100 de seguimiento', async ({
  page,
}, info) => {
  const pesos: Record<string, number> = {}
  page.on('response', async (respuesta) => {
    const url = respuesta.url()
    const clave = url.includes('lead_alta_contexto')
      ? 'lead_alta_contexto'
      : url.includes('/leads_campos')
        ? 'leads_campos'
        : null
    if (clave) pesos[clave] = (pesos[clave] ?? 0) + (await respuesta.body()).length
  })
  const leer = async () => {
    for (const k of Object.keys(pesos)) delete pesos[k]
    await aLeads(page)
    await botonNuevo(page).click()
    await expect(telefono(page)).toBeVisible()
    await expect.poll(() => Object.keys(pesos).length).toBe(2)
    return { ...pesos }
  }
  const conLaSemilla = await leer()
  try {
    sql(`
      insert into public.origenes_lead (clave, nombre, icono, orden)
        select '${PREFIJO_DEL_CATALOGO}' || n, 'E2E catálogo contexto origen ' || n, 'casa', 1000 + n
        from generate_series(1, 100 - (select count(*) from public.origenes_lead)) n;
      insert into public.tipos_lead (clave, nombre, clase, icono, orden)
        select '${PREFIJO_DEL_CATALOGO}' || n, 'E2E catálogo contexto tipo ' || n, 'prospecto', 'persona', 1000 + n
        from generate_series(1, 100 - (select count(*) from public.tipos_lead)) n;
      insert into public.tipos_seguimiento (clave, nombre, icono, orden)
        select '${PREFIJO_DEL_CATALOGO}' || n, 'E2E catálogo contexto seguimiento ' || n, 'nota', 1000 + n
        from generate_series(1, 100 - (select count(*) from public.tipos_seguimiento)) n;
    `)
    const alTope = await leer()
    const resumen = `con la semilla ${JSON.stringify(conLaSemilla)} bytes; con 100 orígenes, 100 tipos de lead y 100 de seguimiento ${JSON.stringify(alTope)}`
    console.warn(`[contexto] ${info.project.name}: ${resumen}`)
    info.annotations.push({ type: 'lectura del alta', description: resumen })
    // Con los tres catálogos al tope la lectura es acotada: lo escribe la base con tope (100 de cada uno) y no crece con nada más.
    expect(alTope['lead_alta_contexto'] ?? 0, resumen).toBeLessThan(40 * 1024)
  } finally {
    sql(`
      delete from public.origenes_lead where clave like '${PREFIJO_DEL_CATALOGO}%';
      delete from public.tipos_lead where clave like '${PREFIJO_DEL_CATALOGO}%';
      delete from public.tipos_seguimiento where clave like '${PREFIJO_DEL_CATALOGO}%';
    `)
  }
})
