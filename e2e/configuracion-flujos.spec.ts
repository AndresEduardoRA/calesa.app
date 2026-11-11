// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import { crearAsesoraDeLaSemilla } from './soporte/recorrido'
import { sql } from './soporte/sql'

// Configuración › Flujos (5.02, `docs/UX.md` › «Flujos: configuración (estados propios)»): la dueña llega desde el hub, ve las fases de un origen en el orden de la
// base, cambia a «Repuestos», abre el inspector de una fase por la URL; un origen recién creado llega desde Orígenes y muestra el vacío; una asesora no ve la
// pantalla. Sólo lectura: no escribe nada. Cuenta lo que dice la base, no números fijos de la semilla.
test.describe.configure({ mode: 'serial' })

const ORIGEN_NUEVO = 'E2E Flujo vacío'
let duena = ''
let asesora = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await borrarOrigenes([])
  duena = correoDePrueba(`duena-flujos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Flora Flujos' })
  asesora = (await crearAsesoraDeLaSemilla(proyecto)).email
})

test.afterAll(async () => {
  await borrarOrigenes([])
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

type FaseEnLaBase = { id: string; nombre: string; inicial: boolean; final: boolean }

// Las fases de un flujo en el orden de la base (`orden`, `nombre`), como las dibuja la pantalla.
function fasesDelFlujo(condicion: string): FaseEnLaBase[] {
  const salida = sql(
    `select f.id || '|' || f.nombre || '|' || f.es_inicial || '|' || f.es_final
       from public.fases f join public.flujos fl on fl.id = f.flujo_id
      where ${condicion}
      order by f.orden, f.nombre`,
  )
  return salida
    .split('\n')
    .filter(Boolean)
    .map((linea) => {
      const [id = '', nombre = '', inicial = '', final = ''] = linea.split('|')
      return { id, nombre, inicial: inicial === 't', final: final === 't' }
    })
}

const nombreDelOrigen = (clave: string) =>
  sql(`select nombre from public.origenes where clave = '${clave}'`)
const nombreDelFlujoDeRepuestos = () =>
  sql("select nombre from public.flujos where ambito = 'repuestos'")

test('la dueña ve las fases de un origen en orden, cambia a repuestos y abre una fase por la URL', async ({
  page,
}) => {
  const subasta = nombreDelOrigen('subasta_usa')
  const fases = fasesDelFlujo(
    "fl.origen_id = (select id from public.origenes where clave = 'subasta_usa')",
  )
  const repuestos = fasesDelFlujo("fl.ambito = 'repuestos'")
  expect(fases.length).toBeGreaterThan(1)
  expect(repuestos.length).toBeGreaterThan(0)

  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion')
  await page.getByRole('link', { name: /Flujos/ }).click()
  await expect(page.getByRole('heading', { name: 'Flujos', level: 1 })).toBeVisible()
  // Con «Documentos» (5.09) hay barra de secciones: «Fases» abre primero; y la de flujos.
  await expect(page.getByRole('tab', { name: 'Fases', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByRole('tab', { name: 'Documentos', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Fases', level: 2 })).toBeVisible()

  // Un origen escrito a mano en la URL: lo que no es suyo abre el primero y no es un error.
  await page.goto('/configuracion/flujos?origen=basura')
  await expect(page.getByRole('heading', { name: 'Fases', level: 2 })).toBeVisible()

  // Abre el de la subasta: las fases como las ordena la base, con «Inicial» y «Final» donde corresponde.
  await page.getByRole('tab', { name: subasta }).click()
  await expect(page).toHaveURL(/origen=/)
  const nombres = page.locator('[data-abre-resumen]')
  await expect(nombres).toHaveText(fases.map((f) => f.nombre))
  for (const fase of fases) {
    const fila = page
      .getByRole('row')
      .filter({ has: page.locator('[data-abre-resumen]', { hasText: fase.nombre }) })
    if (fase.inicial) await expect(fila).toContainText('Inicial')
    if (fase.final) await expect(fila).toContainText('Final')
  }

  // «Repuestos»: la URL lo dice y las fases son las del otro flujo.
  await page.getByRole('tab', { name: nombreDelFlujoDeRepuestos() }).click()
  await expect(page).toHaveURL(/ambito=repuestos/)
  await expect(nombres).toHaveText(repuestos.map((f) => f.nombre))

  // El inspector de una fase: por un clic, y también por la URL tras recargar.
  const primera = repuestos[0]
  if (!primera) throw new Error('El flujo de repuestos no tiene fases.')
  await nombres.first().click()
  await expect(page).toHaveURL(new RegExp(`fase=${primera.id}`))
  const inspector = page.getByRole('dialog')
  await expect(inspector.getByRole('heading', { name: primera.nombre })).toBeVisible()
  for (const bloque of ['Datos', 'Salidas y quién mueve', 'Requisitos para entrar']) {
    await expect(inspector.getByText(bloque, { exact: true })).toBeVisible()
  }
  await page.reload()
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: primera.nombre }),
  ).toBeVisible()

  // Esc lo cierra y quita `fase` de la URL.
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page).not.toHaveURL(/fase=/)

  // Un id que no es de una fase del flujo no abre nada.
  await page.goto(
    '/configuracion/flujos?ambito=repuestos&fase=00000000-0000-4000-8000-000000000000',
  )
  await expect(nombres).toHaveText(repuestos.map((f) => f.nombre))
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('un origen recién creado llega desde Orígenes y su flujo está vacío', async ({ page }) => {
  const origen = await crearOrigenDePrueba(ORIGEN_NUEVO, 'flujo_vacio')
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/origenes')
  await page.getByRole('link', { name: new RegExp(ORIGEN_NUEVO) }).click()
  await expect(page.getByRole('heading', { name: ORIGEN_NUEVO, level: 1 })).toBeVisible()

  const pasos = page.getByRole('region', { name: `Siguientes pasos para ${ORIGEN_NUEVO}` })
  await pasos
    .getByRole('listitem')
    .filter({ hasText: 'Configura el flujo' })
    .getByRole('link', { name: 'Abrir' })
    .click()
  await expect(page).toHaveURL(new RegExp(`/configuracion/flujos\\?origen=${origen.id}`))
  await expect(page.getByRole('tab', { name: ORIGEN_NUEVO })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByText(`El flujo de ${ORIGEN_NUEVO} todavía no tiene fases.`)).toBeVisible()
})

test('una asesora no ve la pantalla de flujos', async ({ page }) => {
  await entrar(page, asesora, { fresco: true })
  await page.goto('/configuracion/flujos')
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Fases', level: 2 })).toBeHidden()
})
