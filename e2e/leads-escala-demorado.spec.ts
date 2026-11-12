import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { conRespuesta, demorarPedido, esRpc } from './soporte/esperas'
import { idDe } from './soporte/leads'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { nuevoLead } from './soporte/leads-ficha'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import {
  embudoPorDefecto,
  etapa,
  irAlEmbudo,
  muchasOportunidades,
  verEtapa,
} from './soporte/leads-oportunidades'
import { esMovil } from './soporte/inventario'
import { TAMANO_DE_COLUMNA } from '../src/shared/lib/paginacion'

// 9-10: el «Ver más» de una columna del kanban se espera por su respuesta aunque el pedido salga 6 s tarde. Aparte de
// `leads-escala.spec.ts` (que ya pasa del tope de líneas) y con su propio terreno.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  test.setTimeout(120_000)
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

test('una columna del kanban: «Ver más» con el pedido demorado 6 s', async ({ page }, info) => {
  test.skip(esMovil(page), 'En el celular la columna se ve por pestañas: la cubre la escritorio.')
  const lead = await nuevoLead({
    corto: `Escala demora ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  const embudo = await embudoPorDefecto(t.personas.berta)
  await muchasOportunidades({
    usuarioId: await idDe(t.personas.berta),
    leadId: lead.id,
    embudo,
    etapaId: etapa(embudo, 'Ganado'),
    cantidad: 120,
  })
  await entrar(page, t.personas.berta)
  await irAlEmbudo(page)
  const columna = await verEtapa(page, 'Ganado')
  await expect(columna.getByRole('article')).toHaveCount(TAMANO_DE_COLUMNA)
  // Con la primera página ya leída: sólo el pedido de «Ver más» sale tarde.
  const demorados = await demorarPedido(
    page,
    (pedido) => pedido.method() === 'POST' && pedido.url().endsWith('/rpc/embudo_etapa_pagina'),
    6_000,
  )
  await conRespuesta(
    page,
    esRpc('embudo_etapa_pagina'),
    () => columna.getByRole('button', { name: 'Ver más' }).click(),
    '«Ver más» del kanban demorado 6 s',
  )
  expect(demorados).toHaveLength(1)
  await expect(columna.getByRole('article')).toHaveCount(2 * TAMANO_DE_COLUMNA)
})
