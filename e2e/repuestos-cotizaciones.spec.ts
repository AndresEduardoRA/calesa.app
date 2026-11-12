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
import { literal, sql } from './soporte/sql'
import { formatearMonto } from '../src/shared/lib/formato'

// La pestaña «Cotizaciones» de `/repuestos/[id]` y la hoja en sólo lectura (8.12-3): la dueña abre la pestaña vacía, crea una cotización (va directo a su hoja,
// «Borrador», sin líneas), vuelve y la ve en la lista «Sin total» (nulo no es 0); una segunda «Nueva cotización» crea otra (el id del intento se renovó). Con
// dos líneas y el total sembrados por SQL (escribir líneas es de 8.12-4), la hoja muestra cada una en su bloque y el total que guardó la base. Quien sólo tiene
// `repuestos.ver` no ve la pestaña, y la URL de la cotización le dice que no tiene permiso.
// La etiqueta no empieza con «E2E»: la limpieza de `repuestos-proyecto.spec.ts` borra esas. Borrar el proyecto borra sus cotizaciones y líneas en cascada.
test.describe.configure({ mode: 'serial' })

// La moneda base del seed (`ajustes_empresa.moneda_base`, `DEFAULT 'USD'`).
const BASE = 'USD'
const monto = (valor: number) => formatearMonto(valor, { moneda: BASE, locale: 'es-BO' })

let etiqueta = ''
let duena = ''
let lectora = ''
let proyecto = ''
let rutaDeLaPrimera = ''
const limpiar = () => {
  if (etiqueta !== '') {
    sql(`delete from repuestos_proyectos where vehiculo_etiqueta = ${literal(etiqueta)}`)
  }
}

test.beforeAll(async ({}, info) => {
  const nombre = info.project.name
  etiqueta = `Prueba cotizaciones e2e ${nombre}`
  limpiar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-cotizaciones-${nombre}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Cotiza' })
  lectora = correoDePrueba(`lectora-cotizaciones-${nombre}`)
  await crearPersona({
    email: lectora,
    contrasena: CONTRASENA,
    nombre: 'Lola Cotiza',
    invitada: true,
  })
  await darRolDePrueba({
    email: lectora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Ve repuestos cotizaciones ${nombre}`,
      clave: `e2e_ve_repuestos_cotizaciones_${nombre}`,
    },
    permisos: ['repuestos.ver'],
  })
  // El seed no trae configuración del cotizador (D39): ésta queda vigente (la de id más alto) y la borra `borrarPersonasDePrueba()`.
  sql(`
    insert into repuestos_cotizador_config (factor_importado, recargo_local, redondeo, creado_por)
      select 1.3500, 0.1000, 1.00, id from auth.users where email = ${literal(duena)}`)
})

test.afterAll(async () => {
  limpiar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('crear una cotización lleva a su hoja; la lista y la hoja muestran lo que guardó la base', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/repuestos?panel=nuevo-proyecto')
  const nuevo = page.getByRole('dialog', { name: 'Nuevo proyecto' })
  await nuevo.getByLabel('Vehículo', { exact: true }).fill(etiqueta)
  await nuevo.getByRole('button', { name: 'Crear proyecto' }).click()
  await expect(page).toHaveURL(/\/repuestos\/[0-9a-f-]{36}$/)
  proyecto = new URL(page.url()).pathname.split('/').pop() ?? ''

  await page.getByRole('tab', { name: 'Cotizaciones' }).click()
  await expect(page).toHaveURL(/[?&]pestana=cotizaciones/)
  await expect(page.getByText('Todavía no hay cotizaciones en este proyecto.')).toBeVisible()

  await page.getByRole('button', { name: 'Nueva cotización' }).click()
  await expect(page).toHaveURL(/\/repuestos\/[0-9a-f-]{36}\/cotizaciones\/[0-9a-f-]{36}$/)
  rutaDeLaPrimera = new URL(page.url()).pathname
  const titulo = page.getByRole('heading', { level: 1, name: /^Cotización #\d+$/ })
  await expect(titulo).toBeVisible()
  const primera = Number((await titulo.textContent())?.replace(/\D/g, ''))
  await expect(page.getByText('Borrador', { exact: true })).toBeVisible()
  await expect(page.getByText('Sin líneas en este bloque.')).toHaveCount(2)

  await page.getByRole('link', { name: 'Volver al proyecto' }).click()
  const lista = page.getByRole('list', { name: 'Cotizaciones del proyecto' })
  const tarjeta = lista.getByRole('listitem').filter({ hasText: `Cotización #${String(primera)}` })
  await expect(tarjeta).toContainText('Borrador')
  await expect(tarjeta).toContainText('Sin total')
  await expect(tarjeta.locator('[data-monto]')).toHaveCount(0)

  // La pantalla conserva su estado al volver: otra «Nueva cotización» crea otra, no devuelve la primera.
  await page.getByRole('button', { name: 'Nueva cotización' }).click()
  await expect(page).not.toHaveURL(new RegExp(`${rutaDeLaPrimera}$`))
  await expect(page.getByRole('heading', { level: 1, name: /^Cotización #\d+$/ })).not.toHaveText(
    `Cotización #${String(primera)}`,
  )

  const id = rutaDeLaPrimera.split('/').pop() ?? ''
  sql(`
    insert into repuestos_cotizaciones_lineas (cotizacion_id, descripcion, bloque, cantidad, costo, logistica_sugerida, caja, total, orden) values
      (${literal(id)}, 'Filtro importado', 'importado', 1, 80, 15, 10, 133, 0),
      (${literal(id)}, 'Aceite local', 'local', 2, 90, 15, 5, 242, 1);
    update repuestos_cotizaciones set total = 375 where id = ${literal(id)}`)
  await page.goto(rutaDeLaPrimera)
  const importado = page.getByRole('list', { name: 'Líneas de Importado' })
  await expect(importado.getByRole('listitem')).toHaveCount(1)
  await expect(importado).toContainText('Filtro importado')
  await expect(importado).toContainText(monto(133))
  const local = page.getByRole('list', { name: 'Líneas de Local' })
  await expect(local).toContainText('Aceite local')
  await expect(local).toContainText(monto(242))
  await expect(page.locator('footer').filter({ hasText: 'Total' })).toContainText(monto(375))
})

test('sin `repuestos.cotizar`: no hay pestaña y la hoja dice que no hay permiso', async ({
  page,
}) => {
  await entrar(page, lectora, { fresco: true })
  await page.goto(`/repuestos/${proyecto}?pestana=cotizaciones`)
  // La URL abre la hoja de ítems (vacía): tiene que verse, no sólo faltar lo de cotizaciones.
  await expect(page.getByRole('heading', { level: 1, name: /^Proyecto #\d+$/ })).toBeVisible()
  await expect(page.getByText('Este proyecto todavía no tiene ítems.')).toBeVisible()
  await expect(page.getByLabel('Nuevo ítem: descripción')).toHaveCount(0)
  await expect(page.getByRole('tab')).toHaveCount(0)
  await expect(page.getByRole('list', { name: 'Cotizaciones del proyecto' })).toHaveCount(0)
  await page.goto(rutaDeLaPrimera)
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await expect(page.getByText('Filtro importado')).toHaveCount(0)
})
