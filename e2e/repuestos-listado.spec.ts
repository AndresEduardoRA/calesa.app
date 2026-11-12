import type { Page } from '@playwright/test'
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
import { crearAsesoraDeLaSemilla } from './soporte/recorrido'
import { sql } from './soporte/sql'

// `/repuestos` (8.09-1): la dueña crea un proyecto externo con la tecla N, cae en su detalle y lo ve en la lista; la búsqueda por `?q=` lo deja o no deja filas; quien sólo ve repuestos ve la
// lista sin «Nuevo proyecto» ni atajo; la asesora de la semilla no tiene `repuestos.ver`. El vinculado a un vehículo (`?vehiculo=`) se prueba en 8.09-4 con
// `repuestos-proyecto.spec.ts`. El spec limpia lo que crea por su etiqueta.
test.describe.configure({ mode: 'serial' })

const ETIQUETA = 'E2E Camión de reparto'
const limpiar = () => {
  sql(`delete from repuestos_proyectos where vehiculo_etiqueta like 'E2E%'`)
}
let duena = ''
let lectora = ''
let asesora = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-repuestos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Repuestos' })
  lectora = correoDePrueba(`lectora-repuestos-${proyecto}`)
  await crearPersona({
    email: lectora,
    contrasena: CONTRASENA,
    nombre: 'Lola Lectora',
    invitada: true,
  })
  await darRolDePrueba({
    email: lectora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Ve repuestos ${proyecto}`,
      clave: `e2e_ve_repuestos_${proyecto}`,
    },
    permisos: ['repuestos.ver'],
  })
  asesora = (await crearAsesoraDeLaSemilla(proyecto)).email
  limpiar()
})

test.afterAll(async () => {
  limpiar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const nuevo = (page: Page) => page.getByRole('dialog', { name: 'Nuevo proyecto' })

test('la dueña crea un proyecto externo con N y lo ve en la lista; la búsqueda lo deja o no', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/repuestos')
  await expect(page.getByRole('button', { name: 'Nuevo proyecto' }).first()).toBeVisible()

  // El atajo de esta pantalla existe recién cuando hidrató; antes, la «n» la toma el «Nuevo lead» del marco (de respaldo): se lo cierra y se insiste. Con el panel pedido (la URL lo
  // dice) no se vuelve a pulsar: la segunda «n» caería en el campo.
  await expect(async () => {
    const url = page.url()
    if (url.includes('panel=nuevo-lead')) await page.keyboard.press('Escape')
    else if (!url.includes('panel=nuevo-proyecto')) await page.keyboard.press('n')
    await expect(nuevo(page)).toBeVisible({ timeout: 1000 })
  }).toPass()

  // Sin vehículo ni etiqueta, la base no se llama: el motivo va junto al campo.
  await nuevo(page).getByRole('button', { name: 'Crear proyecto' }).click()
  await expect(nuevo(page).getByText('Escribe qué vehículo es.')).toBeVisible()

  await nuevo(page).getByLabel('Vehículo', { exact: true }).fill(ETIQUETA)
  await nuevo(page).getByLabel('Cliente (opcional)', { exact: true }).fill('Taller Los Pinos')
  await nuevo(page).getByRole('button', { name: 'Crear proyecto' }).click()
  await expect(nuevo(page)).toBeHidden()

  // Tras crear se va al detalle del proyecto (8.09-2); de ahí se vuelve a la lista, donde el nuevo (el de número más alto) está primero, sin ítems.
  await expect(page).toHaveURL(/\/repuestos\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { name: /^Proyecto #\d+$/ })).toBeVisible()
  await page.goto('/repuestos')
  const principal = page.getByRole('main')
  await expect(principal.getByText(`Externo · ${ETIQUETA}`)).toBeVisible()
  await expect(principal.getByText('Taller Los Pinos')).toBeVisible()
  await expect(principal.getByText('Sin ítems').first()).toBeVisible()

  // La búsqueda por `?q=` lo deja; otro texto no deja filas y dice que nada coincide.
  await page.goto(`/repuestos?q=${encodeURIComponent('E2E Camión')}`)
  await expect(principal.getByText(`Externo · ${ETIQUETA}`)).toBeVisible()
  await page.goto('/repuestos?q=zzzzqqqq')
  await expect(page.getByText('Nada coincide con los filtros')).toBeVisible()
  await expect(principal.getByText(`Externo · ${ETIQUETA}`)).toHaveCount(0)
})

test('quien sólo ve repuestos ve la lista, sin «Nuevo proyecto» ni el atajo N', async ({
  page,
}) => {
  await entrar(page, lectora, { fresco: true })
  await page.goto('/repuestos')
  await expect(page.getByRole('main').getByText(`Externo · ${ETIQUETA}`)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nuevo proyecto' })).toHaveCount(0)
  await page.keyboard.press('n')
  await expect(nuevo(page)).toHaveCount(0)
  // Una URL escrita a mano no abre el formulario ni rompe la pantalla.
  await page.goto('/repuestos?panel=nuevo-proyecto')
  await expect(page.getByRole('main').getByText(`Externo · ${ETIQUETA}`)).toBeVisible()
  await expect(nuevo(page)).toHaveCount(0)
})

test('la asesora de la semilla no tiene repuestos.ver y no ve la lista', async ({ page }) => {
  await entrar(page, asesora, { fresco: true })
  await page.goto('/repuestos')
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await expect(page.getByText(`Externo · ${ETIQUETA}`)).toHaveCount(0)
})
