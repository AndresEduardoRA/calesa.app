import { expect, test } from './soporte/prueba'
import { formatearNumero } from '../src/shared/lib/formato'
import { Teclado, abrirConN, dialogo, entrar } from './soporte/alta'
import { aLaVista, esMovil } from './soporte/inventario'
import { crearLead } from './soporte/leads'
import { mandarAlLimbo, telefonoAlAzar } from './soporte/leads-alta'
import {
  AJENO_CARLOS,
  CI_DE_CARLOS,
  PROPIO_BERTA,
  PROPIO_DALIA,
  irALeads,
  limpiarListado,
  mandarALaPapelera,
  nombre,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import {
  NO_DISPONIBLE,
  botonEditar,
  idDeLead,
  irAFicha,
  ponerExtras,
  telefonoDeLead,
  tituloDeLaFicha,
} from './soporte/leads-ficha'
import { PRESUPUESTO_DE_LA_FICHA_EN_KB } from './soporte/presupuestos'
import { sql } from './soporte/sql'

// La ficha de un lead (`/leads/[id]`) contra la app compilada y el Supabase local: a dónde llegan
// «Ya existe · Abrir», «Abrir ficha» y el drawer del listado, qué ve cada quien (el teléfono
// completo, los extras, los privados) y que lo que no se ve se vea siempre igual. La edición va en
// `leads-ficha-edicion.spec.ts`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const nacionalDe = (completo: string) => completo.slice(t.codigo.length)

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('la cartera ve su ficha: teléfono completo, quién lo tiene y sus datos', async ({ page }) => {
  const id = await idDeLead(PROPIO_BERTA)
  await entrar(page, t.personas.berta)
  await irAFicha(page, id)
  await expect(tituloDeLaFicha(page, nombre(PROPIO_BERTA))).toBeVisible()
  // Sin el permiso del número global, la cabecera dice el propio.
  await expect(
    page.getByText(`Tu n.º ${formatearNumero(t.numeroPropioDeBerta, { decimales: 0 })}`).first(),
  ).toBeVisible()
  await expect(page.getByText('Lo tienes tú')).toBeVisible()
  // Un dato propio con valor y los cuatro fijos en «Datos principales».
  await expect(aLaVista(page.getByText('rojo', { exact: true }))).toBeVisible()
  await expect(page.getByText('Datos principales')).toBeVisible()
  // El teléfono completo, como enlace de llamada, y nada que diga que está enmascarado.
  const llamada = page.locator('a[href^="tel:"]').first()
  await expect(llamada).toBeVisible()
  await expect(page.getByText('Completo solo para su cartera.')).toHaveCount(0)
  // Sin pestañas: «Datos» es la única sección y no se dibuja una barra con un solo elemento.
  await expect(page.getByRole('tablist')).toHaveCount(0)
})

test('desde el drawer del listado: «Abrir ficha» lleva a la ficha, ya con el nombre vigente', async ({
  page,
}) => {
  const id = await idDeLead(PROPIO_BERTA)
  await entrar(page, t.personas.berta)
  await irALeads(page)
  await aLaVista(page.getByText(nombre(PROPIO_BERTA), { exact: true })).click()
  const drawer = page.getByRole('dialog', { name: nombre(PROPIO_BERTA) })
  await expect(drawer).toBeVisible()
  await drawer.getByRole('link', { name: 'Abrir ficha' }).click()
  await expect(page).toHaveURL(new RegExp(`/leads/${id}$`))
  await expect(tituloDeLaFicha(page, nombre(PROPIO_BERTA))).toBeVisible()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('«Ya existe: … · Abrir» del alta lleva a la ficha del lead', async ({ page }) => {
  const id = await idDeLead(PROPIO_BERTA)
  const telefono = await telefonoDeLead(id)
  await entrar(page, t.personas.berta)
  await irALeads(page)
  await abrirConN(page, new Teclado(page))
  const panel = dialogo(page)
  await panel.getByLabel('Teléfono principal').fill(nacionalDe(telefono))
  await expect(panel.getByText(/Ya existe/)).toBeVisible()
  await panel.getByRole('link', { name: 'Abrir' }).click()
  await expect(page).toHaveURL(new RegExp(`/leads/${id}$`))
  await expect(tituloDeLaFicha(page, nombre(PROPIO_BERTA))).toBeVisible()
  // El drawer del alta no quedó abierto sobre la ficha.
  await expect(dialogo(page)).toHaveCount(0)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('el toast «Abrir ficha» del alta lleva al lead recién creado', async ({ page }, info) => {
  const corto = `Toast ${info.project.name}`
  await entrar(page, t.personas.berta)
  await irALeads(page)
  await abrirConN(page)
  const panel = dialogo(page)
  await panel.getByLabel('Teléfono principal').fill(telefonoAlAzar())
  await panel.getByLabel('Nombre').fill(nombre(corto))
  await page.keyboard.press('Control+Enter')
  await panel.getByLabel('Resumen').fill('Primer contacto')
  await page.keyboard.press('Control+Enter')
  await expect(page.getByText(/Lead creado/)).toBeVisible()
  await page.getByRole('button', { name: 'Abrir ficha' }).click()
  await expect(tituloDeLaFicha(page, nombre(corto))).toBeVisible()
  await expect(page).toHaveURL(/\/leads\/[0-9a-f-]{36}$/)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('la dueña con «todos» ve la ficha ajena con los teléfonos enmascarados y sin privados', async ({
  page,
}) => {
  const id = await idDeLead(AJENO_CARLOS)
  await ponerExtras(id, [
    { telefono: `${t.codigo}${telefonoAlAzar()}`, etiqueta: 'Trabajo' },
    { telefono: `${t.codigo}${telefonoAlAzar()}`, etiqueta: null },
  ])
  await entrar(page, t.personas.duena)
  await irAFicha(page, id)
  await expect(tituloDeLaFicha(page, nombre(AJENO_CARLOS))).toBeVisible()
  const cuerpo = page.locator('main')
  // El principal y los extras, enmascarados; nada del número completo en la página.
  await expect(cuerpo.getByText('Completo solo para su cartera.')).toBeVisible()
  await expect(cuerpo.locator('a[href^="tel:"]')).toHaveCount(0)
  await expect(cuerpo.getByText('Trabajo')).toBeVisible()
  const html = await page.content()
  expect(html).not.toContain(t.telefonoDeCarlos)
  expect(html).not.toContain(nacionalDe(t.telefonoDeCarlos))
  // La cédula es «solo la cartera»: se dice, y el valor no está en la página.
  await expect(aLaVista(cuerpo.locator('dt:has-text("Cédula E2E") + dd'))).toHaveText(
    'Solo la cartera',
  )
  expect(html).not.toContain(CI_DE_CARLOS)
  // Lo que sí ve quien ve el lead.
  await expect(aLaVista(cuerpo.getByText('azul', { exact: true }))).toBeVisible()
  await expect(cuerpo.getByText('Lo tiene Carlos Alta Prueba')).toBeVisible()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('inexistente, ajeno, en limbo y en la papelera se ven exactamente igual', async ({ page }) => {
  const enLimbo = await crearLead({
    nombre: 'Ficha Limbo',
    telefono: `${t.codigo}${telefonoAlAzar()}`,
    deQuien: t.personas.carlos,
  })
  const enPapelera = await crearLead({
    nombre: 'Ficha Papelera',
    telefono: `${t.codigo}${telefonoAlAzar()}`,
    deQuien: t.personas.carlos,
  })
  await mandarAlLimbo(enLimbo)
  await mandarALaPapelera(enPapelera)
  const ajeno = await idDeLead(AJENO_CARLOS)

  await entrar(page, t.personas.berta)
  const casos = [
    '00000000-0000-4000-8000-000000000999',
    'esto-no-es-un-id',
    ajeno,
    enLimbo,
    enPapelera,
  ]
  const textos: string[] = []
  for (const caso of casos) {
    await irAFicha(page, caso)
    // Dentro del contenido: durante la transición de página la anterior sigue un momento en el DOM.
    const titulo = page.locator('#contenido').getByText(NO_DISPONIBLE)
    await expect(titulo).toBeVisible()
    textos.push((await page.locator('main').innerText()).replaceAll(/\s+/g, ' '))
    // Ni un nombre, ni un número, ni un indicio del lead ajeno en la página.
    const html = await page.content()
    expect(html).not.toContain(nombre(AJENO_CARLOS))
    expect(html).not.toContain(nombre('Ficha Limbo'))
    expect(html).not.toContain(nombre('Ficha Papelera'))
  }
  expect(new Set(textos).size).toBe(1)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('sin leads.editar no hay botón y la URL de edición no abre nada', async ({ page }) => {
  const id = await idDeLead(PROPIO_DALIA)
  await entrar(page, t.personas.sinCrear)
  await irAFicha(page, id)
  await expect(tituloDeLaFicha(page, nombre(PROPIO_DALIA))).toBeVisible()
  await expect(botonEditar(page)).toHaveCount(0)
  await irAFicha(page, id, '?panel=editar-lead')
  await expect(tituloDeLaFicha(page, nombre(PROPIO_DALIA))).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('abrir la ficha trae poco: lo que aporta sobre el resto de la pantalla y lo que viaja al navegar', async ({
  page,
}, info) => {
  const id = await idDeLead(PROPIO_BERTA)
  await entrar(page, t.personas.berta)
  const kb = (bytes: number) => formatearNumero(bytes / 1024, { decimales: 1 })
  const html = async (ruta: string) => (await (await page.goto(ruta))?.body())?.toString() ?? ''
  // De qué está hecho un documento: el payload RSC en línea (las props de la pantalla), las etiquetas
  // `<script src>` (los chunks) y el resto (el HTML dibujado y los estilos).
  const desglose = (texto: string) => {
    const enLinea = [...texto.matchAll(/<script>self\.__next_f\.push[\s\S]*?<\/script>/g)]
    const chunks = [...texto.matchAll(/<script src="[^"]*"[^>]*><\/script>/g)]
    const suma = (partes: RegExpExecArray[]) => partes.reduce((total, m) => total + m[0].length, 0)
    return { total: texto.length, rsc: suma(enLinea), scripts: suma(chunks) }
  }
  // La marca de referencia: el documento de otra pantalla con el mismo shell (menú, barra, estilos).
  const base = desglose(await html('/perfil'))
  const fichaHtml = desglose(await html(`/leads/${id}`))
  const ficha = fichaHtml.total

  // Navegando desde el listado: el payload RSC de la ficha y nada más.
  await irALeads(page)
  let rsc = 0
  // Se lee el cuerpo antes de entregarlo: una vez que la navegación sigue, ya no está disponible.
  await page.route(`**/leads/${id}**`, async (ruta) => {
    if (ruta.request().headers()['rsc'] !== '1') {
      await ruta.continue()
      return
    }
    const respuesta = await ruta.fetch()
    rsc += (await respuesta.body()).length
    await ruta.fulfill({ response: respuesta })
  })
  await aLaVista(page.getByText(nombre(PROPIO_BERTA), { exact: true })).click()
  await page
    .getByRole('dialog', { name: nombre(PROPIO_BERTA) })
    .getByRole('link', { name: 'Abrir ficha' })
    .click()
  await expect(tituloDeLaFicha(page, nombre(PROPIO_BERTA))).toBeVisible()
  await expect.poll(() => rsc).toBeGreaterThan(0)

  const resumen =
    `documento ${kb(ficha)} KB (otra pantalla: ${kb(base.total)} KB, aporta ${kb(ficha - base.total)} KB: ` +
    `RSC ${kb(fichaHtml.rsc - base.rsc)}, scripts ${kb(fichaHtml.scripts - base.scripts)}, ` +
    `HTML ${kb(ficha - fichaHtml.rsc - fichaHtml.scripts - (base.total - base.rsc - base.scripts))}) · al navegar: ${kb(rsc)} KB`
  console.warn(`[ficha] ${info.project.name}: ${resumen}`)
  info.annotations.push({ type: 'KB de la ficha', description: resumen })
  // Lo que la ficha suma al shell, y lo que viaja al abrirla desde el listado. El tope del documento
  // volvió de 48 a 44 KB en la 6b. Lo que pesa son las props (RSC) y el HTML de «Datos»: los paneles
  // cerrados no suman nada, diferidos o no (docs/DECISIONES.md, 2026-10-15).
  expect(ficha - base.total).toBeLessThan(PRESUPUESTO_DE_LA_FICHA_EN_KB * 1024)
  expect(rsc).toBeLessThan(40 * 1024)
  // Móvil: la cabecera cabe sin desplazar de costado.
  if (esMovil(page)) {
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(ancho).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1)
  }
})

// Con los catálogos en su máximo: hasta 100 orígenes y 100 tipos de lead no viajan con la ficha (cierre 5b). El panel de edición los lee al
// abrirse; antes cada visita pagaba sus ~30 KB, la usara o no. Lo que la ficha suma sobre otra pantalla no depende de cuántos tenga la empresa.
// (El shell tampoco manda ya los del alta: «Nuevo lead» los lee al abrirse, cierre 5b-fix; `e2e/presupuesto-js.spec.ts` mide `/perfil`.)
const PREFIJO_DE_CATALOGO = 'E2E catálogo ficha'

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('los orígenes y los tipos de lead no viajan con la ficha: con los 100 de cada uno aporta lo mismo', async ({
  page,
}, info) => {
  const id = await idDeLead(PROPIO_BERTA)
  await entrar(page, t.personas.berta)
  const documento = async (ruta: string) =>
    (await (await page.goto(ruta))?.body())?.toString() ?? ''
  // Lo que la ficha suma sobre `/perfil` (el mismo shell): su propio documento.
  const aporte = async () =>
    (await documento(`/leads/${id}`)).length - (await documento('/perfil')).length
  const antes = await aporte()
  try {
    // Hasta el tope de la base (100 de cada uno), con nombres que no se parecen a nada del resto de la ficha.
    sql(`
      insert into public.origenes_lead (clave, nombre, orden)
        select 'e2e_cat_ficha_' || n, '${PREFIJO_DE_CATALOGO} origen ' || n, 1000 + n
        from generate_series(1, 100 - (select count(*) from public.origenes_lead)) n;
      insert into public.tipos_lead (clave, nombre, clase, orden)
        select 'e2e_cat_ficha_' || n, '${PREFIJO_DE_CATALOGO} tipo ' || n, 'prospecto', 1000 + n
        from generate_series(1, 100 - (select count(*) from public.tipos_lead)) n;
    `)
    const perfilConTodo = (await documento('/perfil')).length
    const despues = await aporte()
    const resumen = `con 100 orígenes y 100 tipos la ficha aporta ${String(despues)} bytes (antes ${String(antes)}; /perfil pesa ${String(perfilConTodo)})`
    console.warn(`[ficha] ${info.project.name}: ${resumen}`)
    info.annotations.push({ type: 'ficha con los catálogos al máximo', description: resumen })
    // Lo que cambia entre dos lecturas es ruido (unos cientos de bytes): con los catálogos en las props serían ~13 KB más por cada 100.
    expect(Math.abs(despues - antes)).toBeLessThan(2 * 1024)
  } finally {
    sql(`
      delete from public.origenes_lead where clave like 'e2e_cat_ficha_%';
      delete from public.tipos_lead where clave like 'e2e_cat_ficha_%';
    `)
  }
})
