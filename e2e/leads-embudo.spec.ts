import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { aLaVista, esMovil, otraPersona } from './soporte/inventario'
import { idDe } from './soporte/leads'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { nuevoLead } from './soporte/leads-ficha'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import {
  embudoPorDefecto,
  enLaBase,
  etapa,
  etapasEnLaBase,
  irAlEmbudo,
  moverA,
  muchasOportunidades,
  oportunidad,
  tarjeta,
  verEtapa,
} from './soporte/leads-oportunidades'
import { rpcComo } from './soporte/leads-cartera'

// La vista de embudo (`/leads?vista=embudo`): el kanban de las oportunidades propias. Se mueve con
// «Mover a…» (sin arrastrar), una perdida pregunta el motivo, cada columna trae 50 y «Ver más», y en el
// celular las etapas son pestañas. Los embudos son personales: nadie más los ve.
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

test('la primera vez prepara el embudo por defecto, con sus etapas, y dice que los filtros no aplican', async ({
  page,
}) => {
  await entrar(page, t.personas.carlos)
  await irAlEmbudo(page)
  await expect(page.getByText('Todavía no tienes oportunidades en este embudo')).toBeVisible()
  await expect(
    page.getByText(
      'Aquí ves tus oportunidades. Los filtros de la lista no se aplican en esta vista; para llegar a una, búscala.',
    ),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Embudo' })).toHaveAttribute('aria-current', 'page')
  // Desde la lista se llega con el mismo conmutador.
  await page.getByRole('link', { name: 'Lista' }).click()
  await expect(page.getByRole('heading', { name: 'Leads', level: 1 })).toBeAttached()
  await page.getByRole('link', { name: 'Embudo' }).click()
  await expect(page.getByRole('heading', { name: 'Embudo', level: 1 })).toBeAttached()
})

test('mover con el teclado, a una perdida con motivo, y reabrir', async ({ page }, info) => {
  const lead = await leadDeBerta(`Embudo Mover ${info.project.name}`)
  const embudo = await embudoPorDefecto(t.personas.berta)
  const titulo = `Hilux ${info.project.name}`
  const op = await oportunidad(t.personas.berta, lead.id, { titulo, monto_estimado: 25000 })
  await entrar(page, t.personas.berta)
  await irAlEmbudo(page)
  await verEtapa(page, 'Nuevo')
  await expect(tarjeta(page, titulo)).toBeVisible()
  await expect(tarjeta(page, titulo).getByText(lead.nombre)).toBeVisible()

  // Con el teclado: el menú se abre con Enter y se elige con las flechas y Enter.
  await tarjeta(page, titulo)
    .getByRole('button', { name: `Mover «${titulo}» a otra etapa` })
    .focus()
  await page.keyboard.press('Enter')
  // Abierto con el teclado, la primera opción ya tiene el foco; las flechas recorren y vuelven.
  await expect(page.getByRole('menuitem', { name: 'Contactado', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'Cotizado', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Enter')
  await expect.poll(async () => (await enLaBase(op.id))?.etapa_id).toBe(etapa(embudo, 'Contactado'))
  await verEtapa(page, 'Contactado')
  await expect(tarjeta(page, titulo)).toBeVisible()

  // A una perdida: el motivo (opcional) y la insignia.
  await moverA(page, titulo, 'Perdido')
  const dialogo = page.getByRole('dialog', { name: 'Mover a «Perdido»' })
  await dialogo.getByLabel('Motivo (opcional)').fill('Compró en otra parte')
  await dialogo.getByRole('button', { name: 'Mover' }).click()
  await expect
    .poll(async () => enLaBase(op.id))
    .toMatchObject({ estado: 'perdida', motivo_perdida: 'Compró en otra parte' })
  await verEtapa(page, 'Perdido')
  await expect(tarjeta(page, titulo).getByText('Perdida', { exact: true })).toBeVisible()
  await expect(tarjeta(page, titulo).getByText('Motivo: Compró en otra parte')).toBeVisible()

  // Reabrir: a una etapa abierta, sin motivo.
  await moverA(page, titulo, 'Negociación')
  await expect
    .poll(async () => enLaBase(op.id))
    .toMatchObject({ estado: 'abierta', motivo_perdida: null })
})

test('si otra pestaña ya la movió, vuelve a su lugar y ofrece «Recargar»', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Embudo Conflicto ${info.project.name}`)
  const embudo = await embudoPorDefecto(t.personas.berta)
  const titulo = `Conflicto ${info.project.name}`
  const op = await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)
  await irAlEmbudo(page)
  await verEtapa(page, 'Nuevo')
  await expect(tarjeta(page, titulo)).toBeVisible()
  // Otra pestaña la mueve a «Cotizado».
  const { error } = await rpcComo(t.personas.berta, 'oportunidad_mover', {
    p_id: op.id,
    p_etapa_esperada: op.etapa_id,
    p_etapa: etapa(embudo, 'Cotizado'),
  })
  expect(error).toBeNull()
  await moverA(page, titulo, 'Contactado')
  await expect(
    page.getByText('Esta oportunidad ya está en «Cotizado». Recarga para verla donde está.'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recargar' })).toBeVisible()
  await verEtapa(page, 'Nuevo')
  await expect(tarjeta(page, titulo)).toBeVisible()
  expect((await enLaBase(op.id))?.etapa_id).toBe(etapa(embudo, 'Cotizado'))
})

test('cada columna trae 50 y «Ver más» suma las siguientes', async ({ page }, info) => {
  const lead = await leadDeBerta(`Embudo Muchas ${info.project.name}`)
  const embudo = await embudoPorDefecto(t.personas.berta)
  await muchasOportunidades({
    usuarioId: await idDe(t.personas.berta),
    leadId: lead.id,
    embudo,
    etapaId: etapa(embudo, 'Ganado'),
    cantidad: 51,
  })
  await entrar(page, t.personas.berta)
  await irAlEmbudo(page)
  const columna = await verEtapa(page, 'Ganado')
  await expect(columna.getByRole('article')).toHaveCount(50)
  await columna.getByRole('button', { name: 'Ver más (1)' }).click()
  await expect(columna.getByRole('article')).toHaveCount(51)
  await expect(columna.getByRole('button', { name: /Ver más/ })).toHaveCount(0)
})

test('las etapas: las reglas se dicen, se reordenan y una con oportunidades no se quita', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Embudo Etapas ${info.project.name}`)
  const embudo = await embudoPorDefecto(t.personas.berta)
  await oportunidad(t.personas.berta, lead.id, {
    titulo: `En Cotizado ${info.project.name}`,
    etapa_id: etapa(embudo, 'Cotizado'),
  })
  await entrar(page, t.personas.berta)
  await irAlEmbudo(page)
  await page.getByRole('button', { name: 'Etapas' }).click()
  const panel = page.getByRole('dialog', { name: /Etapas de/ })
  await expect(panel).toBeVisible()

  // Sin la única ganada no se guarda, y lo dice antes de enviar.
  await panel.getByRole('checkbox', { name: 'Ganada' }).and(panel.locator(':checked')).uncheck()
  await panel.getByRole('button', { name: 'Guardar' }).click()
  await expect(panel.getByRole('alert')).toHaveText('Hace falta al menos una etapa ganada.')
  await page.keyboard.press('Escape')

  // Reordenar con las flechas y guardar.
  await page.getByRole('button', { name: 'Etapas' }).click()
  await panel.getByRole('button', { name: 'Bajar Nuevo' }).click()
  await panel.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Embudo guardado.')).toBeVisible()
  await expect
    .poll(() => etapasEnLaBase(embudo.id))
    .toEqual(['Contactado', 'Nuevo', 'Cotizado', 'Negociación', 'Ganado', 'Perdido'])

  // Quitar «Cotizado», que tiene una: la base lo rechaza nombrándola.
  await page.getByRole('button', { name: 'Etapas' }).click()
  await panel.getByRole('button', { name: 'Quitar Cotizado' }).click()
  await panel.getByRole('button', { name: 'Guardar' }).click()
  // El embudo de Berta lo comparten los tests de este proyecto: cuántas tiene «Cotizado» depende de ellos.
  await expect(panel.getByRole('alert')).toHaveText(
    /^«Cotizado» tiene \d+ oportunidades?: muévelas antes de quitarla\.$/,
  )
})

test('un embudo nuevo se elige enseguida; nadie más ve los embudos ni las oportunidades de otra persona', async ({
  page,
  browser,
}, info) => {
  await entrar(page, t.personas.berta)
  await irAlEmbudo(page)
  await page.getByRole('button', { name: 'Nuevo embudo' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Nuevo embudo' })
  await dialogo.getByLabel('Nombre').fill('ventas')
  await dialogo.getByRole('button', { name: 'Crear embudo' }).click()
  await expect(dialogo.getByRole('alert')).toHaveText('Ya tienes un embudo «Ventas».')
  await dialogo.getByLabel('Nombre').fill(`Postventa ${info.project.name}`)
  await dialogo.getByRole('button', { name: 'Crear embudo' }).click()
  await expect(
    page.getByRole('button', { name: `Embudo: Postventa ${info.project.name}` }),
  ).toBeVisible()
  await expect(page).toHaveURL(/embudo=/)
  if (!esMovil(page)) {
    await expect(aLaVista(page.getByRole('region', { name: /^Nueva:/ }))).toBeVisible()
  }

  // La dueña ve todos los leads, pero no los embudos ni las oportunidades de Berta.
  const otra = await otraPersona(browser, page)
  await entrar(otra, t.personas.duena)
  await irAlEmbudo(otra)
  await expect(otra.getByText('Todavía no tienes oportunidades en este embudo')).toBeVisible()
  await expect(otra.getByText(`Postventa ${info.project.name}`)).toHaveCount(0)
  await otra.context().close()
})
