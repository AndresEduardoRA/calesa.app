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

// Cuántos nodos del DOM aguanta cada pantalla: lo medido en la 9e más un margen. En el celular hay menos.
const PRESUPUESTO_DE_NODOS = {
  listado: { escritorio: 3_500, movil: 3_500 },
  kanban: { escritorio: 9_000, movil: 6_000 },
}

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
  const tope = PRESUPUESTO_DE_NODOS.listado[info.project.name as 'escritorio' | 'movil']
  expect(primera).toBeLessThan(tope)
  expect(segunda).toBeLessThan(tope)
  // La segunda no pesa más que la primera: una página reemplaza a la otra, no se suma.
  expect(segunda).toBeLessThan(primera * 1.15)
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
