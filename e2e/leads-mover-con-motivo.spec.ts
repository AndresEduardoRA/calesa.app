import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { aLaVista, esMovil } from './soporte/inventario'
import { rpcComo } from './soporte/leads-cartera'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { irAFicha, nuevoLead } from './soporte/leads-ficha'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { demorarAcciones } from './soporte/recorrido'
import {
  embudoPorDefecto,
  enLaBase,
  etapa,
  irAlEmbudo,
  moverA,
  oportunidad,
  tarjeta,
  verEtapa,
} from './soporte/leads-oportunidades'

// «Mover a…» una etapa perdida pregunta el motivo en un modal con su URL
// (`?panel=mover-oportunidad&oportunidad=<id>&destino=<id>`), igual que los de la ficha: foco, Esc, «atrás», recarga, sin red
// y sin doble envío. Se monta una vez por pantalla (el kanban, la sección de la ficha), no una por tarjeta.
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

const botonMoverA = (page: Parameters<typeof tarjeta>[0], titulo: string) =>
  tarjeta(page, titulo).getByRole('button', { name: `Mover «${titulo}» a otra etapa` })

test('en el kanban: abre con su URL, foco en el motivo, Esc vuelve el foco al botón, «atrás» cierra y la recarga reabre', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Motivo Kanban ${info.project.name}`)
  const embudo = await embudoPorDefecto(t.personas.berta)
  const titulo = `Motivo kanban ${info.project.name}`
  const op = await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)
  await irAlEmbudo(page)
  await verEtapa(page, 'Nuevo')
  // En el celular `?etapa=` es la pestaña elegida: abrir y cerrar el modal no la toca.
  if (esMovil(page)) {
    await expect(page).toHaveURL(/[?&]etapa=/)
  }
  const pestana = new URL(page.url()).searchParams.get('etapa')
  await moverA(page, titulo, 'Perdido')

  const dialogo = page.getByRole('dialog', { name: 'Mover a «Perdido»' })
  await expect(dialogo).toBeVisible()
  await expect(page).toHaveURL(
    new RegExp(`panel=mover-oportunidad&oportunidad=${op.id}&destino=${etapa(embudo, 'Perdido')}`),
  )
  await expect(dialogo.getByLabel('Motivo (opcional)')).toBeFocused()

  // Esc cierra, limpia la URL y el foco vuelve al botón «Mover a…» de esa oportunidad.
  await page.keyboard.press('Escape')
  await expect(dialogo).toBeHidden()
  await expect(page).not.toHaveURL(/panel=/)
  expect(new URL(page.url()).searchParams.get('etapa')).toBe(pestana)
  await expect(botonMoverA(page, titulo)).toBeFocused()

  // «Atrás» cierra el modal que se abrió (abrir suma al historial) y «adelante» lo reabre.
  await moverA(page, titulo, 'Perdido')
  await expect(dialogo).toBeVisible()
  // nuqs escribe la URL un instante después de abrir: «atrás» sólo vale cuando ya está escrita.
  await expect(page).toHaveURL(/panel=mover-oportunidad/)
  await page.goBack()
  await expect(dialogo).toBeHidden()
  await page.goForward()
  await expect(dialogo).toBeVisible()

  // La recarga reabre el modal con lo que nombra la URL.
  await page.reload()
  await expect(page.getByRole('dialog', { name: 'Mover a «Perdido»' })).toBeVisible()
  expect((await enLaBase(op.id))?.etapa_id).toBe(op.etapa_id)
})

test('con un motivo escrito, cerrar pregunta en el pie; descartar cierra y mover guarda el motivo', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Motivo Descarte ${info.project.name}`)
  const titulo = `Motivo descarte ${info.project.name}`
  const op = await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)
  await irAlEmbudo(page)
  await verEtapa(page, 'Nuevo')
  await moverA(page, titulo, 'Perdido')
  const dialogo = page.getByRole('dialog', { name: 'Mover a «Perdido»' })
  await dialogo.getByLabel('Motivo (opcional)').fill('Se fue con otra marca')
  await page.keyboard.press('Escape')
  await expect(dialogo.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await dialogo.getByRole('button', { name: 'Seguir editando' }).click()
  await expect(dialogo.getByLabel('Motivo (opcional)')).toHaveValue('Se fue con otra marca')
  await page.keyboard.press('Escape')
  await dialogo.getByRole('button', { name: 'Descartar' }).click()
  await expect(dialogo).toBeHidden()
  expect((await enLaBase(op.id))?.estado).toBe('abierta')

  await moverA(page, titulo, 'Perdido')
  await dialogo.getByLabel('Motivo (opcional)').fill('Se fue con otra marca')
  await dialogo.getByRole('button', { name: 'Mover' }).click()
  await expect(dialogo).toBeHidden()
  await expect
    .poll(async () => enLaBase(op.id))
    .toMatchObject({ estado: 'perdida', motivo_perdida: 'Se fue con otra marca' })
})

test('sin red lo dice adentro y no mueve; con red, mueve', async ({ page, context }, info) => {
  const lead = await leadDeBerta(`Motivo Sin red ${info.project.name}`)
  const titulo = `Motivo sin red ${info.project.name}`
  const op = await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)
  await irAlEmbudo(page)
  await verEtapa(page, 'Nuevo')
  await moverA(page, titulo, 'Perdido')
  const dialogo = page.getByRole('dialog', { name: 'Mover a «Perdido»' })
  // El código del modal llega al abrirlo (`diferido()`): se corta la red cuando ya está.
  await expect(dialogo.getByLabel('Motivo (opcional)')).toBeVisible()
  await context.setOffline(true)
  await dialogo.getByLabel('Motivo (opcional)').fill('Sin conexión')
  await dialogo.getByRole('button', { name: 'Mover' }).click()
  await expect(dialogo.getByText(/conexión/i).first()).toBeVisible()
  await expect(dialogo).toBeVisible()
  expect((await enLaBase(op.id))?.estado).toBe('abierta')
  await context.setOffline(false)
  await dialogo.getByRole('button', { name: 'Mover' }).click()
  await expect(dialogo).toBeHidden()
  await expect.poll(async () => enLaBase(op.id)).toMatchObject({ estado: 'perdida' })
})

test('un doble clic en «Mover» manda un solo pedido y el modal no se cierra mientras mueve', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Motivo Doble ${info.project.name}`)
  const titulo = `Motivo doble ${info.project.name}`
  const op = await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)
  await irAlEmbudo(page)
  await verEtapa(page, 'Nuevo')
  await moverA(page, titulo, 'Perdido')
  const dialogo = page.getByRole('dialog', { name: 'Mover a «Perdido»' })
  const enviadas = await demorarAcciones(page, 800)
  await dialogo.getByRole('button', { name: 'Mover' }).dblclick()
  await expect(dialogo.getByRole('button', { name: 'Moviendo…' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(dialogo).toBeVisible()
  await expect(dialogo).toBeHidden()
  await expect.poll(async () => enLaBase(op.id)).toMatchObject({ estado: 'perdida' })
  expect(enviadas).toHaveLength(1)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('una URL escrita a mano que no se puede abrir no abre nada, avisa y se limpia', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Motivo Mano ${info.project.name}`)
  const embudo = await embudoPorDefecto(t.personas.berta)
  const titulo = `Motivo mano ${info.project.name}`
  const op = await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)
  // La oportunidad no existe.
  await irAlEmbudo(
    page,
    `&panel=mover-oportunidad&oportunidad=00000000-0000-4000-8000-000000000999&destino=${etapa(embudo, 'Perdido')}`,
  )
  await expect(page.getByText('Esa oportunidad ya no está en la lista.').first()).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).not.toHaveURL(/panel=/)
  // Una etapa que no pide motivo.
  await irAlEmbudo(
    page,
    `&panel=mover-oportunidad&oportunidad=${op.id}&destino=${etapa(embudo, 'Cotizado')}`,
  )
  await expect(page.getByText(/no pide un motivo/).first()).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).not.toHaveURL(/panel=/)
})

test('si la oportunidad la mueve otra pestaña con el modal abierto, el conflicto se dice y se puede recargar', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Motivo Conflicto ${info.project.name}`)
  const embudo = await embudoPorDefecto(t.personas.berta)
  const titulo = `Motivo conflicto ${info.project.name}`
  const op = await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)
  await irAlEmbudo(page)
  await verEtapa(page, 'Nuevo')
  await moverA(page, titulo, 'Perdido')
  const dialogo = page.getByRole('dialog', { name: 'Mover a «Perdido»' })
  const { error } = await rpcComo(t.personas.berta, 'oportunidad_mover', {
    p_id: op.id,
    p_etapa_esperada: op.etapa_id,
    p_etapa: etapa(embudo, 'Cotizado'),
  })
  expect(error).toBeNull()
  await dialogo.getByRole('button', { name: 'Mover' }).click()
  await expect(
    page.getByText('Esta oportunidad ya está en «Cotizado». Recarga para verla donde está.'),
  ).toBeVisible()
  expect((await enLaBase(op.id))?.etapa_id).toBe(etapa(embudo, 'Cotizado'))
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('en la ficha: la misma URL, el mismo modal, y mueve con el motivo', async ({ page }, info) => {
  const lead = await leadDeBerta(`Motivo Ficha ${info.project.name}`)
  const titulo = `Motivo ficha ${info.project.name}`
  const op = await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id, '?seccion=oportunidades')
  const item = aLaVista(page.getByRole('article', { name: titulo }))
  await item.getByRole('button', { name: `Mover «${titulo}» a otra etapa` }).click()
  await page.getByRole('menuitem', { name: 'Perdido', exact: true }).click()
  const dialogo = page.getByRole('dialog', { name: 'Mover a «Perdido»' })
  await expect(dialogo).toBeVisible()
  await expect(page).toHaveURL(/panel=mover-oportunidad&oportunidad=/)
  await page.keyboard.press('Escape')
  await expect(dialogo).toBeHidden()
  await expect(item.getByRole('button', { name: `Mover «${titulo}» a otra etapa` })).toBeFocused()
  await item.getByRole('button', { name: `Mover «${titulo}» a otra etapa` }).click()
  await page.getByRole('menuitem', { name: 'Perdido', exact: true }).click()
  await dialogo.getByLabel('Motivo (opcional)').fill('No le alcanzó')
  await dialogo.getByRole('button', { name: 'Mover' }).click()
  await expect(dialogo).toBeHidden()
  await expect
    .poll(async () => enLaBase(op.id))
    .toMatchObject({ estado: 'perdida', motivo_perdida: 'No le alcanzó' })
})
