import { expect, test, type Page } from './soporte/prueba'
import { formatearNumero } from '../src/shared/lib/formato'
import { TAMANO_DE_VER_MAS, TOPE_DE_LO_CARGADO } from '../src/shared/lib/paginacion'
import { entrar } from './soporte/alta'
import { idDe } from './soporte/leads'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { irAFicha, nuevoLead, tituloDeLaFicha } from './soporte/leads-ficha'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import {
  embudoPorDefecto,
  etapa,
  oportunidadesPorSql,
  titulosEnElOrdenDeLaBase,
} from './soporte/leads-oportunidades'
import { PRESUPUESTO_DE_LA_FICHA_CON_10_OPORTUNIDADES_EN_KB } from './soporte/presupuestos'

// La sección «Oportunidades» de la ficha: el servidor dibuja las 10 más recientes (las abiertas primero) y «Ver más» lee de a 20 desde el
// navegador, hasta 500 (5a-12, 4.17-2). Lo que no se ve no viaja con el documento de la ficha. El resto de la sección va en
// `leads-oportunidades.spec.ts`. Cada prueba crea su propio lead sobre el terreno de `beforeAll`: ninguna alimenta a otra.

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  test.setTimeout(120_000)
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

// Un lead de Berta con `abiertas` y `cerradas` oportunidades,, y su ficha en «Oportunidades» como ella.
async function leadConOportunidades(
  page: Page,
  corto: string,
  { abiertas, cerradas = 0 }: { abiertas: number; cerradas?: number },
) {
  const lead = await nuevoLead({
    corto,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  if (abiertas + cerradas > 0) {
    const embudo = await embudoPorDefecto(t.personas.berta)
    oportunidadesPorSql({
      usuarioId: await idDe(t.personas.berta),
      leadId: lead.id,
      embudoId: embudo.id,
      etapaAbierta: etapa(embudo, 'Nuevo'),
      etapaCerrada: etapa(embudo, 'Ganado'),
      abiertas,
      cerradas,
    })
  }
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id, '?seccion=oportunidades')
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  return lead
}

const items = (page: Page) => page.getByRole('article')
const verMas = (page: Page) => page.getByRole('button', { name: 'Ver más' })
const titulosVisibles = (page: Page) => items(page).evaluateAll((a) => a.map((x) => x.ariaLabel))

test('con 12: se ven 10 con «Ver más», que trae las 12 sin cambiar la URL', async ({
  page,
}, info) => {
  const lead = await leadConOportunidades(page, `VerMas ${info.project.name}`, { abiertas: 12 })
  await expect(items(page)).toHaveCount(10)
  const url = page.url()
  await verMas(page).click()
  await expect(items(page)).toHaveCount(12)
  await expect(verMas(page)).toHaveCount(0)
  await expect(page.getByText(/Mostrando las/)).toHaveCount(0)
  expect(page.url()).toBe(url)
  expect(url).toContain(`/leads/${lead.id}`)
})

test('con 10 o menos no hay nada que ver: sin «Ver más» ni aviso', async ({ page }, info) => {
  await leadConOportunidades(page, `Diez ${info.project.name}`, { abiertas: 10 })
  await expect(items(page)).toHaveCount(10)
  await expect(verMas(page)).toHaveCount(0)
  await expect(page.getByText(/Mostrando las/)).toHaveCount(0)
})

test('con 25 (15 abiertas y 10 cerradas): «Ver más» las trae todas en el orden de la base y mover, eliminar y deshacer no la reinician', async ({
  page,
}, info) => {
  const lead = await leadConOportunidades(page, `Veinticinco ${info.project.name}`, {
    abiertas: 15,
    cerradas: 10,
  })
  const enLaBase = titulosEnElOrdenDeLaBase(lead.id)
  expect(enLaBase).toHaveLength(25)
  await expect(items(page)).toHaveCount(10)
  expect(await titulosVisibles(page)).toEqual(enLaBase.slice(0, 10))
  await verMas(page).click()
  await expect(items(page)).toHaveCount(25)
  expect(await titulosVisibles(page)).toEqual(enLaBase)
  await expect(verMas(page)).toHaveCount(0)

  // La 12.ª llegó por «Ver más»: se mueve a una etapa abierta y queda primera, con las 25 a la vista (no se reinició a 10).
  const titulo = enLaBase[11] ?? ''
  const item = page.getByRole('article', { name: titulo })
  await item.getByRole('button', { name: `Mover «${titulo}» a otra etapa` }).click()
  await page.getByRole('menuitem', { name: 'Contactado', exact: true }).click()
  await expect(items(page)).toHaveCount(25)
  await expect.poll(async () => (await titulosVisibles(page))[0]).toBe(titulo)
  await expect(item.getByText('En «Contactado» desde')).toBeVisible()

  // Eliminarla deja 24 y «Deshacer» vuelve a 25.
  await item.getByRole('button', { name: `Más acciones de «${titulo}»` }).click()
  await page.getByRole('menuitem', { name: 'Eliminar' }).click()
  await expect(items(page)).toHaveCount(24)
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(items(page)).toHaveCount(25)
  await expect.poll(async () => (await titulosVisibles(page))[0]).toBe(titulo)
})

test('con 1.000 (600 abiertas y 400 cerradas): el documento pesa lo de 10, cada «Ver más» es una página de 20 que no crece y se detiene en 500', async ({
  page,
}, info) => {
  const lead = await leadConOportunidades(page, `Mil ${info.project.name}`, {
    abiertas: 600,
    cerradas: 400,
  })
  const conDiez = await leadConOportunidades(page, `MilDiez ${info.project.name}`, { abiertas: 10 })
  const kb = (bytes: number) => formatearNumero(bytes / 1024, { decimales: 1 })
  const documento = async (ruta: string) =>
    (await (await page.goto(ruta))?.body())?.toString() ?? ''
  const base = (await documento('/perfil')).length
  const deLaFicha = async (id: string) =>
    (await documento(`/leads/${id}?seccion=oportunidades`)).length - base
  const conMil = await deLaFicha(lead.id)
  const deDiez = await deLaFicha(conDiez.id)

  // El documento no crece con lo que hay: la sección trae 10 con 10 o con 1.000.
  expect(conMil).toBeLessThan(PRESUPUESTO_DE_LA_FICHA_CON_10_OPORTUNIDADES_EN_KB * 1024)
  expect(conMil).toBeLessThanOrEqual(deDiez + 2 * 1024)

  await page.goto(`/leads/${lead.id}?seccion=oportunidades`)
  await expect(items(page)).toHaveCount(10)
  const seccion = page.locator('section[aria-labelledby="titulo-oportunidades"]')
  const nodos = () => seccion.evaluate((s) => s.querySelectorAll('*').length)
  const nodosCon10 = await nodos()
  const respuestas: number[] = []
  page.on('response', (r) => {
    if (r.url().includes('/rpc/lead_oportunidades')) {
      void r.body().then((b) => respuestas.push(b.length))
    }
  })

  const pasos = Math.ceil((TOPE_DE_LO_CARGADO - 10) / TAMANO_DE_VER_MAS)
  for (let paso = 1; paso <= pasos; paso += 1) {
    const pedido = page.waitForRequest((r) => r.url().includes('/rpc/lead_oportunidades'))
    await verMas(page).click()
    const cuerpo = (await pedido).postDataJSON() as {
      p_antes_abierta?: unknown
      p_antes_en?: unknown
      p_antes_id?: unknown
    }
    expect(cuerpo).toMatchObject({ p_lead: lead.id, p_tamano: TAMANO_DE_VER_MAS })
    expect(typeof cuerpo.p_antes_abierta).toBe('boolean')
    expect(typeof cuerpo.p_antes_en).toBe('string')
    expect(typeof cuerpo.p_antes_id).toBe('string')
    await expect(items(page)).toHaveCount(
      Math.min(TOPE_DE_LO_CARGADO, 10 + paso * TAMANO_DE_VER_MAS),
    )
  }
  await expect.poll(() => respuestas.length).toBe(pasos)

  // En el tope: 500, sin «Ver más» y con el aviso.
  await expect(items(page)).toHaveCount(TOPE_DE_LO_CARGADO)
  await expect(verMas(page)).toHaveCount(0)
  await expect(
    page.getByText(
      `Mostrando las ${String(TOPE_DE_LO_CARGADO)} más recientes, las abiertas primero.`,
    ),
  ).toBeVisible()

  // La página 25 no pesa más que la 1.ª (no crece con la profundidad) y los nodos crecen lineales y se detienen.
  const primera = respuestas[0] ?? 0
  const ultima = respuestas.at(-1) ?? 0
  expect(ultima).toBeLessThanOrEqual(primera * 1.1)
  const nodosCon500 = await nodos()
  expect(nodosCon500).toBeLessThanOrEqual(1.1 * 50 * nodosCon10)

  const resumen = `con 1.000 oportunidades la sección aporta ${kb(conMil)} KB (con 10, ${kb(deDiez)} KB); cada «Ver más» pesa ${String(primera)} B la 1.ª y ${String(ultima)} B la última; ${String(nodosCon10)} nodos con 10 y ${String(nodosCon500)} con 500`
  console.warn(`[ficha] ${info.project.name}: ${resumen}`)
  info.annotations.push({ type: 'ficha con 1.000 oportunidades', description: resumen })
})
