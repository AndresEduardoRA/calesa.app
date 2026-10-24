import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  PREFIJO_DE_NIVEL_E2E,
  abrirNiveles,
  borrarNivelesDePrueba,
  concesionesDelPermiso,
  elegirDelMenu,
  filaDeNivel,
  masAccionesDe,
  modalDeNivel,
  nivelEnLaBase,
  nombresAbribles,
  permisosDeNivel,
  retirados,
  sembrarNivel,
} from './soporte/niveles'
import { aLaVistaSinDesplazar, capturar, sinScrollHorizontal, tactil } from './soporte/recorrido'

// El recorrido de Configuración › Cotización › Niveles (paso 4.09-2): los dos de fábrica, crear (con sus dos permisos para el dueño), renombrar,
// cerrar con algo escrito, retirar y restaurar con «Deshacer», eliminar uno sin uso, el foco y el texto al 200 %. Con la dueña, en escritorio y
// celular. Lo que se juzga mirando, en `E2E_CAPTURAS=e2e-capturas/niveles`. Los casos no felices están en `*-casos`.
test.describe.configure({ mode: 'serial' })

let duena = ''
let proyecto = ''
const nombre = (resto: string) => `${PREFIJO_DE_NIVEL_E2E} ${resto} ${proyecto}`

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarNivelesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-niveles-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Niveles' })
})

test.afterAll(async () => {
  borrarNivelesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('de fábrica: «Todos» sólo se lee, «Costos» se renombra y retira pero no se elimina, y el hub lleva a la pantalla', async ({
  page,
}, info) => {
  await entrar(page, duena)
  await page.goto('/configuracion')
  await page.getByRole('link', { name: /Cotización/ }).click()
  await expect(page).toHaveURL(/\/configuracion\/cotizacion/)
  await expect(page.getByRole('tab', { name: 'Niveles de acceso' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByRole('heading', { name: 'Niveles de acceso', level: 2 })).toBeVisible()
  await expect(page.getByText(/de 10 niveles posibles\./)).toBeVisible()

  // «Todos»: se lee y no se cambia. Ni «⋯» ni clic para abrirlo.
  const todos = filaDeNivel(page, 'Todos')
  await expect(todos).toBeVisible()
  await expect(todos.getByText('Lo ve quien ve la cotización')).toBeVisible()
  await expect(masAccionesDe(page, 'Todos')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Abrir Todos' })).toHaveCount(0)

  // «Costos»: Renombrar y Retirar sí, Eliminar apagado con el motivo de la base (las hojas de fábrica lo nombran).
  await masAccionesDe(page, 'Costos').click()
  await expect(page.getByRole('menuitem', { name: 'Renombrar', exact: true })).toBeEnabled()
  await expect(page.getByRole('menuitem', { name: 'Retirar', exact: true })).toBeEnabled()
  await expect(page.getByRole('menuitem', { name: 'Eliminar', exact: true })).toBeDisabled()
  await expect(page.getByText(/Está en \d+ celdas? de \d+ orígenes?/)).toBeVisible()
  await capturar(page, info, 'niveles-de-fabrica-menu')
  await page.keyboard.press('Escape')
  await sinScrollHorizontal(page)
  await capturar(page, info, 'niveles-de-fabrica')
})

test('crear un nivel: nace con sus dos permisos y se los concede al dueño', async ({
  page,
}, info) => {
  const gerencia = nombre('Gerencia')
  await entrar(page, duena)
  await abrirNiveles(page)
  await page.getByRole('button', { name: 'Nuevo nivel' }).click()
  const nuevo = modalDeNivel(page, 'Nuevo nivel de acceso')
  await expect(nuevo).toBeVisible()
  await expect(page).toHaveURL(/panel=nuevo-nivel/)
  await nuevo.getByLabel('Nombre').fill(`  ${gerencia}  `)
  await sinScrollHorizontal(page)
  await capturar(page, info, 'niveles-nuevo')
  await nuevo.getByRole('button', { name: 'Crear nivel' }).click()
  await expect(nuevo).toBeHidden()
  await expect(page).not.toHaveURL(/panel=/)
  await expect(filaDeNivel(page, gerencia)).toBeVisible()
  await expect(filaDeNivel(page, gerencia).getByText('Sin uso')).toBeVisible()

  const creado = nivelEnLaBase(gerencia)
  expect(creado).toBeDefined()
  const clave = creado?.clave ?? ''
  expect(permisosDeNivel(clave)).toEqual([
    `cotizaciones.nivel.${clave}.editar`,
    `cotizaciones.nivel.${clave}.ver`,
  ])
  // El dueño ya los tiene (en la matriz de Roles puede dárselos a otros roles).
  expect(concesionesDelPermiso(`cotizaciones.nivel.${clave}.ver`)).toBeGreaterThan(0)
  expect(concesionesDelPermiso(`cotizaciones.nivel.${clave}.editar`)).toBeGreaterThan(0)
})

test('renombrar con un clic en la fila: cambia el nombre y el de sus permisos, no la clave', async ({
  page,
}) => {
  const antes = nombre('Gerencia')
  const despues = nombre('Dirección')
  const original = nivelEnLaBase(antes)
  await entrar(page, duena)
  await abrirNiveles(page)
  await page.getByRole('button', { name: `Abrir ${antes}`, exact: true }).click()
  const modal = modalDeNivel(page, 'Renombrar nivel')
  await expect(modal).toBeVisible()
  await expect(page).toHaveURL(/panel=renombrar-nivel&nivel=/)
  await expect(modal.getByLabel('Nombre')).toHaveValue(antes)
  // Sin cambios no hay nada que guardar: se cierra.
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal).toBeHidden()
  expect(nivelEnLaBase(antes)?.actualizado_en).toBe(original?.actualizado_en)
  await page.getByRole('button', { name: `Abrir ${antes}`, exact: true }).click()
  await modal.getByLabel('Nombre').fill(despues)
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal).toBeHidden()
  await expect(filaDeNivel(page, despues)).toBeVisible()
  const quedo = nivelEnLaBase(despues)
  expect(quedo?.clave).toBe(original?.clave)
  expect(nivelEnLaBase(antes)).toBeUndefined()
})

test('cerrar el modal con algo escrito pregunta; descartar o seguir editando', async ({ page }) => {
  await entrar(page, duena)
  await abrirNiveles(page)
  await page.getByRole('button', { name: 'Nuevo nivel' }).click()
  const modal = modalDeNivel(page, 'Nuevo nivel de acceso')
  await modal.getByLabel('Nombre').fill(nombre('Sin guardar'))
  await page.keyboard.press('Escape')
  await expect(modal.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await modal.getByRole('button', { name: 'Seguir editando' }).click()
  await expect(modal.getByLabel('Nombre')).toHaveValue(nombre('Sin guardar'))
  await page.keyboard.press('Escape')
  await modal.getByRole('button', { name: 'Descartar' }).click()
  await expect(modal).toBeHidden()
  await expect(page).not.toHaveURL(/panel=/)
  expect(nivelEnLaBase(nombre('Sin guardar'))).toBeUndefined()
  // Un modal abierto y no tocado se cierra sin preguntar.
  await page.getByRole('button', { name: 'Nuevo nivel' }).click()
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
})

test('retirar pasa el nivel a «Retirados», con «Deshacer» y el foco en su «⋯»; restaurar lo devuelve', async ({
  page,
}, info) => {
  const dir = nombre('Dirección')
  await entrar(page, duena)
  await abrirNiveles(page)
  await expect(retirados(page)).toHaveCount(0)
  await elegirDelMenu(page, dir, 'Retirar')
  await expect(page.getByText(`«${dir}» retirado.`)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Retirados', level: 3 })).toBeVisible()
  await expect(retirados(page).getByText(dir, { exact: true })).toBeVisible()
  await expect(
    filaDeNivel(page, dir)
      .getByText(/Retirado el /)
      .first(),
  ).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'pasó a Retirados' })).toBeAttached()
  // El foco sigue en el «⋯» de esa fila, aunque ahora la dibuja otra sección.
  await expect(masAccionesDe(page, dir)).toBeFocused()
  expect(nivelEnLaBase(dir)?.retirado_en).not.toBeNull()
  // Los permisos y las concesiones siguen: lo que ya lo usa se sigue filtrando igual.
  expect(permisosDeNivel(nivelEnLaBase(dir)?.clave ?? '')).toHaveLength(2)
  await capturar(page, info, 'niveles-retirado')

  // «Deshacer» lo devuelve a los niveles en uso.
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(retirados(page)).toHaveCount(0)
  await expect.poll(() => nivelEnLaBase(dir)?.retirado_en ?? null).toBeNull()

  // Retirarlo de nuevo y restaurarlo desde su «⋯».
  await elegirDelMenu(page, dir, 'Retirar')
  await expect(retirados(page).getByText(dir, { exact: true })).toBeVisible()
  await masAccionesDe(page, dir).click()
  await expect(page.getByRole('menuitem', { name: 'Retirar', exact: true })).toHaveCount(0)
  await page.getByRole('menuitem', { name: 'Restaurar', exact: true }).click()
  await expect(page.getByText(`«${dir}» restaurado.`)).toBeVisible()
  await expect(retirados(page)).toHaveCount(0)
  await expect(masAccionesDe(page, dir)).toBeFocused()
  await expect.poll(() => nivelEnLaBase(dir)?.retirado_en ?? null).toBeNull()
})

test('«Costos» también se retira y se restaura, y no se pierde su nombre', async ({ page }) => {
  await entrar(page, duena)
  await abrirNiveles(page)
  await elegirDelMenu(page, 'Costos', 'Retirar')
  await expect(retirados(page).getByText('Costos', { exact: true })).toBeVisible()
  await masAccionesDe(page, 'Costos').click()
  await expect(page.getByRole('menuitem', { name: 'Eliminar', exact: true })).toBeDisabled()
  await page.getByRole('menuitem', { name: 'Restaurar', exact: true }).click()
  await expect(retirados(page)).toHaveCount(0)
  await expect.poll(() => nivelEnLaBase('Costos')?.retirado_en ?? null).toBeNull()
})

test('eliminar uno sin uso: pide confirmar nombrándolo y se lleva el nivel y sus permisos', async ({
  page,
}) => {
  const dir = nombre('Dirección')
  const clave = nivelEnLaBase(dir)?.clave ?? ''
  await entrar(page, duena)
  await abrirNiveles(page)
  await elegirDelMenu(page, dir, 'Eliminar')
  const dialogo = page.getByRole('dialog', { name: `Eliminar el nivel «${dir}»` })
  await expect(dialogo).toBeVisible()
  await expect(page).toHaveURL(/panel=eliminar-nivel&nivel=/)
  await dialogo.getByRole('button', { name: 'Eliminar nivel' }).click()
  await expect(dialogo).toBeHidden()
  await expect(page.getByText(`«${dir}» eliminado.`)).toBeVisible()
  await expect(filaDeNivel(page, dir)).toHaveCount(0)
  expect(nivelEnLaBase(dir)).toBeUndefined()
  expect(permisosDeNivel(clave)).toEqual([])
  expect(concesionesDelPermiso(`cotizaciones.nivel.${clave}.ver`)).toBe(0)
})

test('al 200 %: la página no se ensancha y el nombre y el «⋯» de cada fila están a la vista', async ({
  page,
}, info) => {
  // Del largo máximo que admite la base (40): el nombre se corta con «…» y el «⋯» sigue a la vista.
  sembrarNivel(nombre('Largo largo largo'))
  sembrarNivel(nombre('Retirado largo'), { retirado: true })
  await entrar(page, duena)
  await abrirNiveles(page)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await sinScrollHorizontal(page)
  const filas = page.getByRole('button', { name: /^Más acciones de / })
  const total = await filas.count()
  expect(total).toBeGreaterThan(2)
  for (const n of [0, 1, total - 1]) {
    await aLaVistaSinDesplazar(filas.nth(n), `el «⋯» de la fila ${String(n + 1)}`)
  }
  const nombres = nombresAbribles(page)
  for (const n of [0, (await nombres.count()) - 1]) {
    await aLaVistaSinDesplazar(nombres.nth(n), `el nombre de la fila ${String(n + 1)}`)
  }
  await tactil(page, filas.first())
  await capturar(page, info, 'niveles-200')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = ''
  })
})
