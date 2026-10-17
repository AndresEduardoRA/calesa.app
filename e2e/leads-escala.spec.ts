import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { idDe } from './soporte/leads'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { nuevoLead } from './soporte/leads-ficha'
import {
  filas,
  limpiarListado,
  prepararListado,
  irALeads,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import {
  embudoPorDefecto,
  etapa,
  irAlEmbudo,
  muchasOportunidades,
  verEtapa,
} from './soporte/leads-oportunidades'
import { esMovil } from './soporte/inventario'
import { vistasDelHtml } from './soporte/listas-por-pagina'
import { capturar, sinScrollHorizontal } from './soporte/recorrido'
import { TAMANO_DE_COLUMNA, TAMANO_DE_PAGINA_POR_DEFECTO } from '../src/shared/lib/paginacion'

// La escala de lo que se dibuja (9e, `.claude/rules/escala.md`): el listado y una columna del kanban tienen
// un tope de nodos aunque haya miles detrás, el tope se dice, y abrir un modal cuyo código nunca se pidió sin
// red no tumba la pantalla. Aserciones deterministas (nodos, textos), sin cronómetros.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  test.setTimeout(120_000)
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

// Lo que dice `diferido()` (src/shared/ui/diferido.tsx) cuando el código de un modal no llega.
const MENSAJE_SIN_CONEXION = 'Sin conexión. No se pudo abrir esto.'

const nodos = (page: Page) => page.evaluate(() => document.querySelectorAll('*').length)

// Cuántos nodos del DOM aguanta cada pantalla: lo medido más un margen. Desde el cierre 1 el listado dibuja una sola vista
// (la tabla o las tarjetas): 50 filas, ~1.500 nodos (eran ~2.700); 100 filas, ~2.600 en escritorio y ~2.800 en el celular
// (eran ~5.000: la tabla y las tarjetas estaban las dos en el DOM). `?por=100` entra a la corrida normal.
const PRESUPUESTO_DE_NODOS = {
  listado: { escritorio: 2_200, movil: 2_200 },
  listadoDe100: { escritorio: 3_500, movil: 3_500 },
  kanban: { escritorio: 9_000, movil: 6_000 },
}
type Proyecto = 'escritorio' | 'movil'

test('el listado dibuja una página de 50 filas y los nodos no crecen con las páginas', async ({
  page,
}, info) => {
  const dueno = await idDe(t.personas.berta)
  // 160 leads más de Berta, directo en la base (el trigger arma su cartera): tres páginas de 50.
  const { error } = await admin()
    .from('leads')
    .insert(
      Array.from({ length: 160 }, (_, i) => ({
        nombre: `E2E Escala ${String(i + 1)} ${info.project.name}`,
        telefono_principal: `5917${info.project.name === 'movil' ? '81' : '80'}${String(i).padStart(5, '0')}`,
        creado_por: dueno,
      })),
    )
  expect(error).toBeNull()
  await entrar(page, t.personas.berta)
  await irALeads(page, '?q=Escala')
  await expect(filas(page)).toHaveCount(TAMANO_DE_PAGINA_POR_DEFECTO)
  const primera = await nodos(page)
  await page.getByRole('link', { name: 'Siguiente' }).click()
  await expect(filas(page)).toHaveCount(TAMANO_DE_PAGINA_POR_DEFECTO)
  const segunda = await nodos(page)
  info.annotations.push({
    type: 'nodos del listado',
    description: `página 1: ${String(primera)}, página 2: ${String(segunda)}`,
  })
  const tope = PRESUPUESTO_DE_NODOS.listado[info.project.name as Proyecto]
  expect(primera).toBeLessThan(tope)
  expect(segunda).toBeLessThan(tope)
  // La segunda no pesa más que la primera: una página reemplaza a la otra, no se suma.
  expect(segunda).toBeLessThan(primera * 1.15)
})

// Cierre 1: no hay «página N» (con cursor no se sabe sin contar); arriba se dice lo que sí es verdad.
test('arriba dice «Los más recientes» o hasta qué fecha llega la página, y vuelve al principio con la búsqueda', async ({
  page,
}) => {
  await entrar(page, t.personas.berta)
  await irALeads(page, '?q=Escala')
  await expect(page.getByText('Los más recientes', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Siguiente' }).click()
  await expect(page.getByText(/^Creados hasta el \d{1,2} \S+ \d{4}$/)).toBeVisible()
  await expect(page.getByText('Los más recientes', { exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: 'Volver al principio' }).click()
  await expect(page.getByText('Los más recientes', { exact: true })).toBeVisible()
  const url = new URL(page.url())
  expect(url.searchParams.has('cursor')).toBe(false)
  expect(url.searchParams.get('q')).toBe('Escala')
})

test('con 100 por página el listado cabe en su presupuesto de nodos y el HTML lleva una sola vista', async ({
  page,
}, info) => {
  await entrar(page, t.personas.berta)
  const respuesta = await page.goto('/leads?q=Escala&por=100')
  await expect(filas(page)).toHaveCount(100)
  const movil = esMovil(page)
  // La vista que toca a este ancho, y sólo ella, ya en el HTML del servidor.
  expect(vistasDelHtml((await respuesta?.text()) ?? '')).toEqual({ tabla: !movil, tarjetas: movil })
  const n = await nodos(page)
  info.annotations.push({ type: 'nodos con 100 filas', description: String(n) })
  expect(n).toBeLessThan(PRESUPUESTO_DE_NODOS.listadoDe100[info.project.name as Proyecto])
  // El selector a la vista sin bajar (en el celular, arriba de la lista), en claro, en oscuro y con el texto al 200 %.
  await expect(page.getByLabel('Ítems por página')).toBeInViewport()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'listado-100-claro')
  await page.emulateMedia({ colorScheme: 'dark' })
  await capturar(page, info, 'listado-100-oscuro')
  await page.emulateMedia({ colorScheme: 'light' })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await expect(page.getByLabel('Ítems por página')).toBeVisible()
  await capturar(page, info, 'listado-100-texto-grande')
})

test('sin la cookie del ancho, el user-agent elige la vista y el HTML trae sólo ésa', async ({
  page,
  context,
}) => {
  await entrar(page, t.personas.berta)
  await context.clearCookies({ name: 'ancho' })
  const respuesta = await page.goto('/leads?q=Escala')
  const movil = esMovil(page)
  expect(vistasDelHtml((await respuesta?.text()) ?? '')).toEqual({ tabla: !movil, tarjetas: movil })
  await expect(filas(page)).toHaveCount(TAMANO_DE_PAGINA_POR_DEFECTO)
  // Ya hidratada, la página deja el ancho para la próxima.
  await expect
    .poll(async () => (await context.cookies()).find((c) => c.name === 'ancho')?.value)
    .toBe(String(page.viewportSize()?.width))
})

test('girar el celular o redimensionar cambia de vista sin red, sin recargar y con el ancho al día', async ({
  page,
  context,
}) => {
  await entrar(page, t.personas.berta)
  await irALeads(page, '?q=Escala')
  await expect(filas(page)).toHaveCount(TAMANO_DE_PAGINA_POR_DEFECTO)
  const inicial = page.viewportSize() ?? { width: 1280, height: 720 }
  // El celular girado (915 de ancho) ya es tabla; el escritorio a 600, tarjetas.
  const otro = esMovil(page)
    ? { width: inicial.height, height: inicial.width }
    : { width: 600, height: inicial.height }
  const tabla = page.locator('tbody tr')
  const tarjetas = page.locator('li article')
  const vista = (ancho: number) =>
    ancho >= 768 ? { si: tabla, no: tarjetas } : { si: tarjetas, no: tabla }
  const documentos: string[] = []
  page.on('request', (pedido) => {
    if (pedido.resourceType() === 'document' || /:54621\//.test(pedido.url())) {
      documentos.push(pedido.url())
    }
  })
  // Sin red: las filas ya están en la página, cambiar de vista no pide nada.
  await context.setOffline(true)
  await page.setViewportSize(otro)
  await expect(vista(otro.width).si).toHaveCount(TAMANO_DE_PAGINA_POR_DEFECTO)
  await expect(vista(otro.width).no).toHaveCount(0)
  await page.setViewportSize(inicial)
  await expect(vista(inicial.width).si).toHaveCount(TAMANO_DE_PAGINA_POR_DEFECTO)
  await expect(vista(inicial.width).no).toHaveCount(0)
  await context.setOffline(false)
  expect(documentos).toEqual([])
  await page.setViewportSize(otro)
  await expect
    .poll(async () => (await context.cookies()).find((c) => c.name === 'ancho')?.value)
    .toBe(String(otro.width))
  await page.setViewportSize(inicial)
})

test('una columna del kanban con más de 500: «500+», «Ver más» hasta el tope y el aviso', async ({
  page,
}, info) => {
  test.skip(esMovil(page), 'En el celular la columna se ve por pestañas: la cubre la escritorio.')
  const lead = await nuevoLead({
    corto: `Escala kanban ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  const embudo = await embudoPorDefecto(t.personas.berta)
  await muchasOportunidades({
    usuarioId: await idDe(t.personas.berta),
    leadId: lead.id,
    embudo,
    etapaId: etapa(embudo, 'Ganado'),
    cantidad: 560,
  })
  await entrar(page, t.personas.berta)
  await irAlEmbudo(page)
  const columna = await verEtapa(page, 'Ganado')
  await expect(columna.getByRole('heading', { name: /Ganado/ })).toContainText('500+')
  await expect(columna.getByRole('article')).toHaveCount(TAMANO_DE_COLUMNA)
  // De 50 en 50 hasta 500 (nueve veces): sin número, porque pasó el tope.
  for (let i = 1; i < 10; i += 1) {
    await columna.getByRole('button', { name: 'Ver más' }).click()
    await expect(columna.getByRole('article')).toHaveCount(50 * (i + 1))
  }
  await expect(columna.getByRole('button', { name: /Ver más/ })).toHaveCount(0)
  await expect(columna.getByText(/Mostrando las 500 con actividad más reciente/)).toBeVisible()
  const total = await nodos(page)
  info.annotations.push({ type: 'nodos de una columna en el tope', description: String(total) })
  expect(total).toBeLessThan(PRESUPUESTO_DE_NODOS.kanban.escritorio)
})

test('sin red, abrir un modal cuyo código nunca se pidió lo dice en su lugar y se reintenta', async ({
  page,
}, info) => {
  const lead = await nuevoLead({
    corto: `Escala sin red ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  await entrar(page, t.personas.berta)
  await page.goto(`/leads/${lead.id}?seccion=seguimientos`)
  const titulo = page.getByRole('heading', { name: lead.nombre, level: 1 })
  await expect(titulo).toBeVisible()
  const anotar = page.getByRole('button', { name: 'Anotar seguimiento' }).first()
  await expect(anotar).toBeVisible()

  await page.context().setOffline(true)
  await anotar.click()
  // El aviso en su lugar, con «Reintentar»; la pantalla sigue en pie (no cayó a «No se pudo cargar»).
  // La barra fija del modal (otras partes de la ficha que tampoco habían llegado pueden decir lo suyo en su lugar).
  const alerta = page.locator('.fixed').getByRole('alert').filter({ hasText: MENSAJE_SIN_CONEXION })
  await expect(alerta).toBeVisible({ timeout: 10_000 })
  await expect(titulo).toBeVisible()
  await expect(page.getByText('No se pudo cargar')).toHaveCount(0)

  await page.context().setOffline(false)
  await alerta.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByRole('dialog', { name: /Anotar seguimiento/ })).toBeVisible()
  await expect(alerta).toHaveCount(0)
})
