import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { sql } from './soporte/sql'
import { formatearMonto } from '../src/shared/lib/formato'

// La pestaña «Compras» de `/repuestos/[id]` (8.11-2): la dueña (con `repuestos.costos.ver`) abre «Compras» desde la barra, ve la compra sembrada y el margen por moneda
// (precios 2 × 50, compras 60, margen 40); al quitarle la moneda al ítem, el margen ya no es un monto sino «Sin precio en 1 ítem» (nulo no es 0). Quien sólo tiene
// `repuestos.ver` no ve la pestaña y `?pestana=compras` le abre la hoja. Con costos (8.11-3): registrar una compra en el Drawer la suma al margen con el `monto_base`
// que pone la base; eliminarla la saca y «Deshacer» la devuelve.
// La etiqueta no empieza con «E2E»: la limpieza de `repuestos-proyecto.spec.ts` borra esas. Borrar el proyecto borra sus ítems y compras en cascada.
test.describe.configure({ mode: 'serial' })

const BOMBA = 'Bomba de agua'
const PROVEEDOR = 'Repuestos Andinos'
const OTRO_PROVEEDOR = 'Frenos del Sur'
// La moneda base del seed (`ajustes_empresa.moneda_base`, `DEFAULT 'USD'`): la compra va en la base para que `monto_base = monto`.
const BASE = 'USD'
const monto = (valor: number) => formatearMonto(valor, { moneda: BASE, locale: 'es-BO' })

let etiqueta = ''
let duena = ''
let lectora = ''
let proyecto = ''
const limpiar = () => {
  if (etiqueta !== '') {
    sql(`delete from repuestos_proyectos where vehiculo_etiqueta = '${etiqueta}'`)
  }
}

test.beforeAll(async ({}, info) => {
  const nombre = info.project.name
  etiqueta = `Prueba compras e2e ${nombre}`
  limpiar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-compras-${nombre}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Compras' })
  lectora = correoDePrueba(`lectora-compras-${nombre}`)
  await crearPersona({
    email: lectora,
    contrasena: CONTRASENA,
    nombre: 'Lola Compras',
    invitada: true,
  })
  await darRolDePrueba({
    email: lectora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Ve repuestos compras ${nombre}`,
      clave: `e2e_ve_repuestos_compras_${nombre}`,
    },
    permisos: ['repuestos.ver'],
  })
})

test.afterAll(async () => {
  limpiar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('con costos: la pestaña «Compras» lista la compra y el margen; sin precio no es 0', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/repuestos?panel=nuevo-proyecto')
  const nuevo = page.getByRole('dialog', { name: 'Nuevo proyecto' })
  await nuevo.getByLabel('Vehículo', { exact: true }).fill(etiqueta)
  await nuevo.getByRole('button', { name: 'Crear proyecto' }).click()
  await expect(page).toHaveURL(/\/repuestos\/[0-9a-f-]{36}$/)
  proyecto = new URL(page.url()).pathname.split('/').pop() ?? ''

  const nueva = page.getByLabel('Nuevo ítem: descripción')
  await nueva.fill(BOMBA)
  await nueva.press('Enter')
  await expect(page.getByLabel(`Descripción del ítem ${BOMBA}`)).toBeVisible()
  // Las compras se escriben por RPC (el Drawer es de 8.11-3): acá se siembran como `postgres`.
  sql(
    `update repuestos_items set cantidad = 2, precio_cliente = 50, moneda = '${BASE}' where proyecto_id = '${proyecto}'`,
  )
  sql(
    `insert into repuestos_compras (proyecto_id, item_id, proveedor, moneda, monto, monto_base) select proyecto_id, id, '${PROVEEDOR}', '${BASE}', 60, 60 from repuestos_items where proyecto_id = '${proyecto}'`,
  )
  await page.reload()

  await page.getByRole('tab', { name: 'Compras' }).click()
  await expect(page).toHaveURL(/[?&]pestana=compras/)
  await expect(page.getByRole('tab', { name: 'Compras', selected: true })).toBeVisible()

  const compras = page.getByRole('list', { name: 'Compras del proyecto' })
  const fila = compras.getByRole('listitem').filter({ hasText: PROVEEDOR })
  await expect(fila).toContainText(BOMBA)
  await expect(fila).toContainText(monto(60))

  const margen = page.getByRole('region', { name: 'Margen del proyecto' })
  const valorDe = (titulo: string) =>
    margen.getByText(titulo, { exact: true }).locator('xpath=following-sibling::dd')
  await expect(valorDe('Precios')).toContainText(monto(100))
  await expect(valorDe('Compras')).toContainText(monto(60))
  await expect(valorDe('Margen')).toContainText(monto(40))

  // Un ítem con precio y sin moneda: el margen no se sabe (nulo), no es un monto.
  sql(`update repuestos_items set moneda = null where proyecto_id = '${proyecto}'`)
  await page.reload()
  await expect(valorDe('Margen')).toHaveText('Sin precio en 1 ítem')
  await expect(valorDe('Margen').locator('[data-monto]')).toHaveCount(0)
})

test('sin costos: no hay pestaña «Compras» y su URL abre la hoja', async ({ page }) => {
  await entrar(page, lectora, { fresco: true })
  await page.goto(`/repuestos/${proyecto}?pestana=compras`)
  await expect(page.getByText(BOMBA)).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Compras' })).toHaveCount(0)
  await expect(page.getByText(PROVEEDOR)).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Margen del proyecto' })).toHaveCount(0)
})

test('con costos: registrar una compra en el Drawer suma al margen; eliminarla y deshacer', async ({
  page,
}) => {
  // El caso 1 le quitó la moneda al ítem: vuelve a la base para que el margen sea un monto.
  sql(`update repuestos_items set moneda = '${BASE}' where proyecto_id = '${proyecto}'`)
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}?pestana=compras`)
  const margen = page.getByRole('region', { name: 'Margen del proyecto' })
  const valorDe = (titulo: string) =>
    margen.getByText(titulo, { exact: true }).locator('xpath=following-sibling::dd')
  await expect(valorDe('Margen')).toContainText(monto(40))

  // Abrir va fuera del diálogo; guardar, dentro (el pie repite «Registrar compra», D6).
  await page.getByRole('button', { name: 'Registrar compra' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Registrar compra' })
  await dialogo.getByLabel('Ítem').selectOption({ label: BOMBA })
  await dialogo.getByLabel('Proveedor').fill(OTRO_PROVEEDOR)
  await dialogo.getByLabel('Monto').fill('15')
  await dialogo.getByRole('button', { name: 'Registrar compra' }).click()
  await expect(dialogo).toBeHidden()

  const compras = page.getByRole('list', { name: 'Compras del proyecto' })
  const fila = compras.getByRole('listitem').filter({ hasText: OTRO_PROVEEDOR })
  await expect(fila).toContainText(monto(15))
  await expect(valorDe('Compras')).toContainText(monto(75))
  await expect(valorDe('Margen')).toContainText(monto(25))
  // El equivalente en la base lo puso la base (en la moneda base, sin tipo de cambio).
  expect(
    sql(
      `select monto_base || '|' || coalesce(tipo_cambio_id::text, 'nulo') from repuestos_compras where proyecto_id = '${proyecto}' and proveedor = '${OTRO_PROVEEDOR}'`,
    ).trim(),
  ).toBe('15.00|nulo')

  await fila.getByRole('button', { name: /^Más acciones de / }).click()
  await page.getByRole('menuitem', { name: 'Eliminar' }).click()
  await expect(page.getByText('Compra eliminada.')).toBeVisible()
  await expect(fila).toHaveCount(0)
  await expect(valorDe('Margen')).toContainText(monto(40))

  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByText('Compra restituida.')).toBeVisible()
  await expect(fila).toContainText(monto(15))
  await expect(valorDe('Margen')).toContainText(monto(25))
})
