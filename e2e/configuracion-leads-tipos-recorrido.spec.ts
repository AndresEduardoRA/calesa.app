import { expect, test } from './soporte/prueba'
import { CONTRASENA, abrirConN, dialogo, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarLeadsDePrueba } from './soporte/leads'
import { leadsConTelefono, telefonoAlAzar } from './soporte/leads-alta'
import { codigoDePaisDeLaEmpresa } from './soporte/leads-alta'
import {
  PREFIJO_DE_TIPO_E2E,
  abrirTipos,
  borrarTiposDePrueba,
  filaDeTipo,
  modalDeTipo,
  tipoEnLaBase,
} from './soporte/tipos-de-lead'
import { cerrarMenu, elegirDelMenu, lineaApagada, lineaDelMenu } from './soporte/lista-de-catalogo'
import {
  capturar,
  crearAsesoraDeLaSemilla,
  recibeElClic,
  sinScrollHorizontal,
  tactil,
} from './soporte/recorrido'

// El recorrido de la IA de los tipos de lead (9j) con la dueña y una asesora del rol `asesor`, en escritorio y celular: crear un tipo de la
// clase cliente, usarlo en un alta, desactivarlo con un lead que lo tiene, intentar dejar una clase sin activos, el texto al 200 %, el tema
// oscuro, el teclado y lo que ve la asesora. Lo que se juzga mirando, en `E2E_CAPTURAS=e2e-capturas/9j`.
test.describe.configure({ mode: 'serial' })

let duena = ''
let asesora = ''
let proyecto = ''
const mayorista = () => `${PREFIJO_DE_TIPO_E2E} Mayorista ${proyecto}`

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarLeadsDePrueba()
  await borrarTiposDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-tipos-recorrido-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Tipos' })
  asesora = (await crearAsesoraDeLaSemilla(proyecto)).email
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await borrarTiposDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('A · la dueña crea un tipo de la clase cliente, lo usa en un alta y lo desactiva con un lead que lo tiene', async ({
  page,
}, info) => {
  await entrar(page, duena)
  await abrirTipos(page)
  // De fábrica: uno de cada clase, y cada uno es el último activo de la suya.
  expect(await lineaApagada(page, 'Prospecto', 'Desactivar')).toBe(true)
  expect(await lineaApagada(page, 'Cliente', 'Desactivar')).toBe(true)
  await sinScrollHorizontal(page)
  await capturar(page, info, 'duena-de-fabrica')

  await page.getByRole('button', { name: 'Nuevo tipo' }).first().click()
  const modal = modalDeTipo(page, 'Nuevo tipo')
  await expect(modal).toBeVisible()
  await modal.getByLabel('Nombre').fill(mayorista())
  await modal.locator('label', { hasText: /^Cliente/ }).click()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'duena-nuevo-tipo')
  await modal.getByRole('button', { name: 'Crear tipo' }).click()
  await expect(modal).toBeHidden()
  await expect(filaDeTipo(page, mayorista()).getByText('Sin leads')).toBeVisible()
  // Ya hay dos activos de la clase cliente: «Cliente» se puede apagar.
  expect(await lineaApagada(page, 'Cliente', 'Desactivar')).toBe(false)
  await capturar(page, info, 'duena-con-el-nuevo')

  // El alta lo ofrece y guarda un lead con él.
  const codigo = await codigoDePaisDeLaEmpresa()
  const numero = telefonoAlAzar()
  await abrirConN(page)
  const panel = dialogo(page)
  await panel.getByLabel('Teléfono principal').fill(numero)
  await panel.getByLabel('Nombre').fill(`E2E Tipo recorrido ${proyecto}`)
  await panel.getByLabel('Tipo').selectOption({ label: mayorista() })
  await capturar(page, info, 'duena-alta-con-el-tipo')
  await panel.getByRole('button', { name: 'Guardar lead' }).click()
  await expect(page.getByText(/Lead creado/)).toBeVisible()
  const [lead] = await leadsConTelefono(`${codigo}${numero}`)
  expect(lead?.tipo_lead_id).toBe((await tipoEnLaBase(mayorista()))?.id)
  await page.keyboard.press('Escape')

  // Con un lead que lo tiene: se desactiva, se conserva en él y no se elimina.
  await abrirTipos(page)
  const fila = filaDeTipo(page, mayorista())
  await expect(fila.getByText('Tiene leads', { exact: true })).toBeVisible()
  await elegirDelMenu(page, mayorista(), 'Desactivar')
  await expect(fila.getByText('Desactivado')).toBeVisible()
  expect(await lineaApagada(page, mayorista(), 'Eliminar')).toBe(true)
  await sinScrollHorizontal(page)
  await capturar(page, info, 'duena-desactivado-con-leads')

  // Ya no se ofrece en un alta nueva, pero el lead lo conserva en la ficha: «(inactivo)».
  await abrirConN(page)
  await expect(
    dialogo(page).getByLabel('Tipo').locator('option', { hasText: mayorista() }),
  ).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page.goto(`/leads/${lead?.id ?? ''}`)
  await expect(page.getByText(`${mayorista()} (inactivo)`).first()).toBeVisible()
  // El distintivo del tipo cabe dentro de la tarjeta (con un nombre largo se cortaba contra su borde en el celular): la tarjeta llega
  // hasta el margen de 16 px de la pantalla.
  const caja = await page.getByText(`${mayorista()} (inactivo)`).last().boundingBox()
  const ancho = page.viewportSize()?.width ?? 0
  expect((caja?.x ?? 0) + (caja?.width ?? 0)).toBeLessThanOrEqual(ancho - 16)
  await capturar(page, info, 'duena-ficha-inactivo')

  // De vuelta: con el tipo apagado, «Cliente» es otra vez el último de su clase y la pantalla lo dice antes de intentarlo.
  await abrirTipos(page)
  await lineaDelMenu(page, 'Cliente', 'Desactivar')
  await expect(
    page.getByText('Es el único tipo activo de la clase «cliente»: activa o crea otro antes.'),
  ).toBeVisible()
  await capturar(page, info, 'duena-ultimo-de-su-clase')
  await cerrarMenu(page, 'Cliente')
})

test('B · el teclado recorre la lista y los textos y el tema oscuro caben: 200 %, oscuro y un modal', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirTipos(page)
  // Tab llega a las acciones de cada fila y todas reciben el clic (también tocando, en el celular).
  for (const boton of await page
    .getByRole('button', { name: /^(Subir|Bajar|Más acciones de) / })
    .all()) {
    if (await boton.isEnabled()) {
      await boton.scrollIntoViewIfNeeded()
      await recibeElClic(boton)
      await tactil(page, boton)
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0))

  await page.emulateMedia({ colorScheme: 'dark' })
  await sinScrollHorizontal(page)
  await capturar(page, info, 'duena-oscuro')

  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await sinScrollHorizontal(page)
  await capturar(page, info, 'duena-oscuro-200')

  await page.getByRole('button', { name: `Abrir ${mayorista()}`, exact: true }).click()
  const modal = modalDeTipo(page, 'Editar tipo')
  await expect(modal).toBeVisible()
  await expect(modal.getByText('La clase se elige al crear el tipo y no se cambia.')).toBeVisible()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'duena-editar-200')
  await page.keyboard.press('Escape')
  await page.emulateMedia({ colorScheme: 'light' })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = ''
  })
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('C · la asesora no ve la pantalla, y su alta ofrece los tipos activos', async ({
  page,
}, info) => {
  await page.context().clearCookies()
  await entrar(page, asesora, { fresco: true })
  await page.goto('/configuracion/leads?seccion=tipos')
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await capturar(page, info, 'asesora-sin-permiso')

  await abrirConN(page)
  const tipo = dialogo(page).getByLabel('Tipo')
  const opciones = await tipo.locator('option').allTextContents()
  expect(opciones).toEqual(expect.arrayContaining(['Prospecto', 'Cliente']))
  expect(opciones).not.toContain(mayorista())
  await expect(tipo.locator('option:checked')).toHaveText('Prospecto')
  await capturar(page, info, 'asesora-alta')
})
