import { formatearNumero } from '../src/shared/lib/formato'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { aLaVista, otraPersona } from './soporte/inventario'
import { idDe } from './soporte/leads'
import { rpcComo } from './soporte/leads-cartera'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { irAFicha, nuevoLead } from './soporte/leads-ficha'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { embudoPorDefecto, enLaBase, etapa, oportunidad } from './soporte/leads-oportunidades'
import { PRESUPUESTO_DE_LA_FICHA_EN_KB } from './soporte/presupuestos'

// La sección «Oportunidades» de la ficha (`?seccion=oportunidades`): las de quien mira sobre el lead,
// sólo con el lead en la cartera. «Nueva oportunidad» y «Editar» en un panel con su URL, «Mover a…» y
// eliminar con «Deshacer». Nadie más ve las de otra persona, ni la dueña con «todos».
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const leadDeBerta = (corto: string) =>
  nuevoLead({ corto, telefono: completoCon(t, nacional()), deQuien: t.personas.berta })

const irAOportunidades = (page: Parameters<typeof irAFicha>[0], leadId: string) =>
  irAFicha(page, leadId, '?seccion=oportunidades')

const item = (page: Parameters<typeof irAFicha>[0], titulo: string) =>
  aLaVista(page.getByRole('article', { name: titulo }))

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('crear desde el panel: lo que falta se dice junto al campo y entra en la etapa inicial', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Op Crear ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irAOportunidades(page, lead.id)
  await expect(page.getByText('Todavía no tienes oportunidades con este lead')).toBeVisible()
  await page.getByRole('button', { name: 'Nueva oportunidad' }).click()
  await expect(page).toHaveURL(/panel=nueva-oportunidad/)
  const panel = page.getByRole('dialog', { name: 'Nueva oportunidad' })
  await panel.getByLabel(/Monto estimado/).fill('mucho')
  await panel.getByRole('button', { name: 'Crear oportunidad' }).click()
  await expect(panel.getByText('El título lleva entre 1 y 120 caracteres.')).toBeVisible()
  await expect(panel.getByText(/Escribe el monto con números/)).toBeVisible()
  const titulo = `Hilux ${info.project.name}`
  await panel.getByLabel('Título').fill(titulo)
  await panel.getByLabel(/Monto estimado/).fill('25.000,50')
  await panel.getByLabel('Notas (opcional)').fill('Quiere financiar')
  await panel.getByRole('button', { name: 'Crear oportunidad' }).click()
  await expect(item(page, titulo)).toBeVisible()
  await expect(item(page, titulo).getByText('Nuevo', { exact: true })).toBeVisible()
  await expect(item(page, titulo).getByText('Abierta', { exact: true })).toBeVisible()
  await expect(item(page, titulo).getByText(/25\.000,50/)).toBeVisible()
  await expect(item(page, titulo).getByText('Quiere financiar')).toBeVisible()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('editar con versión: otra pestaña la cambió y se ofrece «Recargar» sin perder lo escrito', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Op Editar ${info.project.name}`)
  const titulo = `Editar ${info.project.name}`
  const op = await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)
  await irAOportunidades(page, lead.id)
  await item(page, titulo)
    .getByRole('button', { name: `Más acciones de «${titulo}»` })
    .click()
  await page.getByRole('menuitem', { name: 'Editar' }).click()
  const panel = page.getByRole('dialog', { name: 'Editar oportunidad' })
  await panel.getByLabel('Título').fill(`${titulo} 2`)
  // Otra pestaña la edita mientras tanto.
  const { error } = await rpcComo(t.personas.berta, 'oportunidad_guardar', {
    p_id: op.id,
    p_actualizado_en_esperado: op.actualizado_en,
    p_cambios: { notas: 'desde otra pestaña' },
  })
  expect(error).toBeNull()
  await panel.getByRole('button', { name: 'Guardar' }).click()
  await expect(panel.getByText(/Cambiaste esta oportunidad .* desde otra ventana/)).toBeVisible()
  await expect(panel.getByLabel('Título')).toHaveValue(`${titulo} 2`)
  await expect(panel.getByRole('button', { name: 'Recargar' })).toBeVisible()
})

test('mover a una ganada desde la ficha y reabrir; eliminar ofrece «Deshacer»', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Op Mover ${info.project.name}`)
  const embudo = await embudoPorDefecto(t.personas.berta)
  const titulo = `Mover ${info.project.name}`
  const op = await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)
  await irAOportunidades(page, lead.id)
  await item(page, titulo)
    .getByRole('button', { name: `Mover «${titulo}» a otra etapa` })
    .click()
  await page.getByRole('menuitem', { name: 'Ganado', exact: true }).click()
  await expect(item(page, titulo).getByText('Ganada', { exact: true })).toBeVisible()
  await expect.poll(async () => (await enLaBase(op.id))?.estado).toBe('ganada')
  await item(page, titulo)
    .getByRole('button', { name: `Mover «${titulo}» a otra etapa` })
    .click()
  await page.getByRole('menuitem', { name: 'Contactado', exact: true }).click()
  await expect
    .poll(async () => enLaBase(op.id))
    .toMatchObject({ estado: 'abierta', etapa_id: etapa(embudo, 'Contactado') })

  await item(page, titulo)
    .getByRole('button', { name: `Más acciones de «${titulo}»` })
    .click()
  await page.getByRole('menuitem', { name: 'Eliminar' }).click()
  await expect(item(page, titulo)).toHaveCount(0)
  await expect.poll(async () => (await enLaBase(op.id))?.eliminado_en).not.toBeNull()
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(item(page, titulo)).toBeVisible()
  await expect.poll(async () => (await enLaBase(op.id))?.eliminado_en).toBeNull()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('quién la ve: el compartido tiene la sección pero no la de Berta; la dueña con «todos» no tiene la sección', async ({
  page,
  browser,
}, info) => {
  const lead = await leadDeBerta(`Op Ver ${info.project.name}`)
  const titulo = `De Berta ${info.project.name}`
  await oportunidad(t.personas.berta, lead.id, { titulo })
  const { error } = await rpcComo(t.personas.berta, 'lead_compartir', {
    p_lead: lead.id,
    p_usuario: await idDe(t.personas.carlos),
  })
  expect(error).toBeNull()
  await entrar(page, t.personas.carlos)
  await irAOportunidades(page, lead.id)
  await expect(page.getByText('Todavía no tienes oportunidades con este lead')).toBeVisible()
  await expect(page.getByText(titulo)).toHaveCount(0)

  const otra = await otraPersona(browser, page)
  await entrar(otra, t.personas.duena)
  await irAOportunidades(otra, lead.id)
  await expect(aLaVista(otra.getByRole('link', { name: 'Oportunidades' }))).toHaveCount(0)
  await expect(otra.getByText(titulo)).toHaveCount(0)
  await otra.context().close()
})

test('lo que aporta la ficha con la sección «Oportunidades»', async ({ page }, info) => {
  const lead = await leadDeBerta(`Op Pesa ${info.project.name}`)
  for (const n of [1, 2, 3]) {
    await oportunidad(t.personas.berta, lead.id, {
      titulo: `Pesa ${String(n)} ${info.project.name}`,
      monto_estimado: 1000 * n,
    })
  }
  await entrar(page, t.personas.berta)
  const largo = async (ruta: string) =>
    ((await (await page.goto(ruta))?.body())?.length ?? 0) as number
  const kb = (bytes: number) => formatearNumero(bytes / 1024, { decimales: 1 })
  const base = await largo('/perfil')
  const datos = await largo(`/leads/${lead.id}`)
  const oportunidades = await largo(`/leads/${lead.id}?seccion=oportunidades`)
  const resumen = `«Datos» aporta ${kb(datos - base)} KB · «Oportunidades» aporta ${kb(oportunidades - base)} KB`
  console.warn(`[ficha con oportunidades] ${info.project.name}: ${resumen}`)
  info.annotations.push({ type: 'KB de la ficha con oportunidades', description: resumen })
  expect(datos - base).toBeLessThan(PRESUPUESTO_DE_LA_FICHA_EN_KB * 1024)
  expect(oportunidades - base).toBeLessThan(PRESUPUESTO_DE_LA_FICHA_EN_KB * 1024)
})
