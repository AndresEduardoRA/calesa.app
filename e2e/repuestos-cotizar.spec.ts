// @sin-celular-archivo: el camino feliz de la hoja editable va en escritorio (e2e.md, D54); el celular sigue recorriendo la hoja de lectura en repuestos-cotizaciones.
import type { Locator } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { literal, sql } from './soporte/sql'
import { formatearMonto } from '../src/shared/lib/formato'

// Cotizar repuestos de punta a punta (8.12-4, el Assert de la fila): con la configuración publicada (factor 1,35, recargo 10 %, redondeo 1), un tramo USD
// [0, 100) → 15 y las cajas USD 10 y 5, la dueña crea una cotización, agrega una línea importada desde un ítem (costo 80, logística sugerida, caja 10) y una
// local libre (2 × costo 90, caja 5): el total en vivo es 133 + 242 = 375; guarda y la base guarda 375.00; acepta y el ítem queda con 133.00 USD.
// La etiqueta no empieza con «E2E» (la limpieza de `repuestos-proyecto.spec.ts` borra esas). El proyecto, el ítem, el tramo y las cajas se siembran por SQL
// (no es lo que se prueba) y se borran al final; la configuración y la cotización las borra `borrarPersonasDePrueba()`.
test.describe.configure({ mode: 'serial' })

const BASE = 'USD'
const monto = (valor: number) => formatearMonto(valor, { moneda: BASE, locale: 'es-BO' })
const ITEM = 'Filtro de aceite'

let etiqueta = ''
let duena = ''
let item = ''
const sembrados = { tramo: '', cajas: [] as string[] }

function limpiar() {
  if (etiqueta !== '') {
    const items = `select i.id from repuestos_items i join repuestos_proyectos p on p.id = i.proyecto_id where p.vehiculo_etiqueta = ${literal(etiqueta)}`
    sql(`
      delete from repuestos_cotizaciones where proyecto_id in (select id from repuestos_proyectos where vehiculo_etiqueta = ${literal(etiqueta)});
      delete from historial_fases where repuesto_id in (${items});
      delete from repuestos_items where id in (${items});
      delete from repuestos_proyectos where vehiculo_etiqueta = ${literal(etiqueta)}`)
  }
  if (sembrados.tramo !== '') {
    sql(`delete from repuestos_tramos_logistica where id = ${literal(sembrados.tramo)}`)
  }
  for (const id of sembrados.cajas) sql(`delete from repuestos_cajas where id = ${literal(id)}`)
}

// Una línea de la hoja: su celda (un `group` con el nombre de la etiqueta) se confirma tipeando y Enter.
async function tipear(celda: Locator, valor: string) {
  await celda.locator('[data-parada="0"]').focus()
  await celda.page().keyboard.type(valor)
  await celda.page().keyboard.press('Enter')
}

test.beforeAll(async ({}, info) => {
  etiqueta = `Prueba cotizar e2e ${info.project.name}`
  limpiar()
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-cotizar-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Cotizar' })
  // Lo que pudo dejar una corrida cortada: cajas USD de 10 y 5 y tramos USD activos que crucen [0, 100) (el snapshot copia los montos: nada los referencia).
  sql(`
    delete from repuestos_cajas where moneda = ${literal(BASE)} and monto in (10, 5);
    delete from repuestos_tramos_logistica
      where moneda = ${literal(BASE)} and activo and costo_min < 100 and (costo_max is null or costo_max > 0)`)
  sql(`
    insert into repuestos_cotizador_config (factor_importado, recargo_local, redondeo, creado_por)
      select 1.3500, 0.1000, 1.00, id from auth.users where email = ${literal(duena)}`)
  sembrados.tramo = sql(`
    insert into repuestos_tramos_logistica (moneda, costo_min, costo_max, monto, activo)
      values (${literal(BASE)}, 0, 100, 15, true) returning id`)
  sembrados.cajas = sql(`
    insert into repuestos_cajas (moneda, monto, activa)
      values (${literal(BASE)}, 10, true), (${literal(BASE)}, 5, true) returning id`).split('\n')
  const proyecto = sql(`
    insert into repuestos_proyectos (vehiculo_etiqueta) values (${literal(etiqueta)}) returning id`)
  item = sql(`
    insert into repuestos_items (proyecto_id, descripcion, cantidad)
      values (${literal(proyecto)}, ${literal(ITEM)}, 1) returning id`)
})

test.afterAll(async () => {
  limpiar()
  await borrarPersonasDePrueba()
})

test('cotizar una línea importada y una local, guardar y aceptar deja el precio en el ítem', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const proyecto = sql(
    `select id from repuestos_proyectos where vehiculo_etiqueta = ${literal(etiqueta)}`,
  )
  await page.goto(`/repuestos/${proyecto}?pestana=cotizaciones`)
  await page.getByRole('button', { name: 'Nueva cotización' }).click()
  await expect(page).toHaveURL(/\/cotizaciones\/[0-9a-f-]{36}$/)
  const id = new URL(page.url()).pathname.split('/').pop() ?? ''
  const titulo = page.getByRole('heading', { level: 1, name: /^Cotización #\d+$/ })
  const encabezado = (await titulo.textContent()) ?? ''

  // Importado, desde el ítem: costo 80, la logística sale sugerida del tramo (15), caja 10 → 80 × 1,35 + 15 + 10 = 133.
  const importado = page.getByRole('region', { name: 'Importado' })
  await importado.getByLabel('Ítem para Importado').selectOption({ label: ITEM })
  await importado.getByRole('button', { name: 'Agregar desde un ítem' }).click()
  const primera = importado.getByRole('listitem', { name: 'Línea 1 de Importado' })
  await expect(primera.getByLabel('Descripción')).toHaveValue(ITEM)
  await tipear(primera.getByRole('group', { name: 'Costo' }), '80')
  await expect(primera.getByRole('group', { name: 'Logística' })).toContainText(/15/)
  await expect(primera).toContainText('Sin total · Falta la caja')
  await primera.getByLabel('Caja', { exact: true }).selectOption('10.00')
  await expect(primera).toContainText(monto(133))

  // Local, libre: 2 × (90 + 15 + 5) × 1,10 = 242.
  const local = page.getByRole('region', { name: 'Local' })
  await local.getByRole('button', { name: 'Agregar línea' }).click()
  const segunda = local.getByRole('listitem', { name: 'Línea 1 de Local' })
  await segunda.getByLabel('Descripción').fill('Aceite local')
  await tipear(segunda.getByRole('group', { name: 'Cantidad' }), '2')
  await tipear(segunda.getByRole('group', { name: 'Costo' }), '90')
  await segunda.getByLabel('Caja', { exact: true }).selectOption('5.00')
  await expect(segunda).toContainText(monto(242))

  const pie = page.locator('footer').filter({ hasText: 'Total' })
  await expect(pie).toContainText(monto(375))
  await expect(page.getByRole('button', { name: 'Aceptar', exact: true })).toBeDisabled()
  await expect(page.getByText('Guarda los cambios antes de aceptar.')).toBeVisible()

  // Guardar: la base recalcula y guarda; la hoja nace de lo guardado.
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Cambios sin guardar')).toHaveCount(0)
  await expect(pie).toContainText(monto(375))
  expect(sql(`select total::text from repuestos_cotizaciones where id = ${literal(id)}`)).toBe(
    '375.00',
  )

  // Aceptar: el diálogo nombra el número y el total guardado.
  await page.getByRole('button', { name: 'Aceptar', exact: true }).click()
  await expect(page).toHaveURL(/[?&]panel=aceptar-cotizacion/)
  const dialogo = page.getByRole('dialog', {
    name: `Aceptar la cotización ${encabezado.replace('Cotización ', '')}`,
  })
  await expect(dialogo).toContainText(monto(375))
  await dialogo.getByRole('button', { name: 'Aceptar cotización' }).click()
  await expect(dialogo).toBeHidden()
  await expect(page.getByText('Aceptada', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar' })).toHaveCount(0)
  expect(
    sql(
      `select precio_cliente::text || ' ' || moneda from repuestos_items where id = ${literal(item)}`,
    ),
  ).toBe('133.00 USD')
})
