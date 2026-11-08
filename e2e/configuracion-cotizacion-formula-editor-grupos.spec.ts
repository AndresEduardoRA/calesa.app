// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { formatearMonto } from '../src/shared/lib/formato'
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { MARCA, borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { publicarFormulaConTexto } from './soporte/formula-editor'
import { leerBorrador } from './soporte/formula-editor-guardar'
import { sql } from './soporte/sql'

// La sección «Grupos» del editor de la fórmula (4.21-3c, `docs/UX.md` › «Cotización: fórmula (estados propios)»): editar el plazo y el tono de un grupo y pasar una
// fila a un grupo de otro bucket, que cambia «Total en Bs» en la vista previa; guardar el borrador lo escribe. La fórmula de prueba (`cotizar-formula.ts`) tiene
// `gpub` (bucket `origen` → `tc`, clave `oficial`) y `gx` (bucket `alt` → `tc_x`, clave `paralelo`); `con_ayuda` es una constante de 5 en `gpub` y lo demás vale 0.
test.describe.configure({ mode: 'serial' })

let duena = ''
let origen = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-grupos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Greta Grupos' })
  origen = await crearOrigenDeCotizar(proyecto, 'ggrupos', false)
  publicarFormulaConTexto(origen.id)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const editor = (page: Page) => page.getByRole('region', { name: 'Editor de la fórmula' })
const grupos = (page: Page) => page.getByRole('list', { name: 'Grupos de la fórmula' })
const grupo = (page: Page, id: string) => grupos(page).locator(`li[data-grupo="${id}"]`)
const fila = (page: Page, id: string) =>
  page.getByRole('list', { name: 'Filas de la fórmula' }).locator(`li[data-fila="${id}"]`)
const previa = (page: Page) => page.getByRole('region', { name: 'Vista previa' })

const tipoDeCambio = (clave: string) =>
  Number(sql(`select valor from public.tipos_cambio where clave = '${clave}' and activo`))
const enBs = (valor: number) => formatearMonto(valor, { moneda: 'BOB', locale: 'es-BO' })

test('E1: plazo y tono de un grupo; pasar «Con ayuda» a `gx` cambia «Total en Bs» a 5 × su tipo de cambio; guardar lo escribe', async ({
  page,
}) => {
  const [otroTono, nombreDelOtro] = sql(
    `select clave || '|' || nombre from public.tonos where clave <> 'verde' order by nombre limit 1`,
  ).split('|')
  if (!otroTono || !nombreDelOtro) throw new Error('el catálogo de tonos está vacío')

  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/cotizacion?seccion=formula&origen=${origen.id}`)
  await page.getByRole('button', { name: 'Editar en un borrador', exact: true }).click()
  await expect(grupos(page)).toBeVisible()
  await expect(previa(page)).toContainText(enBs(5 * tipoDeCambio('oficial')))

  // (1) El plazo y el tono de «Pública».
  const publica = grupo(page, 'gpub')
  await expect(publica).toContainText('Plazo: 1 día')
  await publica.getByRole('button', { name: 'Editar el grupo Pública' }).click()
  await publica.getByLabel('Plazo de pago').fill('3 días')
  await publica.getByLabel('Tono').selectOption(otroTono)
  await publica.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(publica).toContainText('Plazo: 3 días')
  await expect(publica).toContainText(`Tono: ${nombreDelOtro}`)

  // (2) «Con ayuda» pasa a `gx`, de otro bucket: el total en Bs pasa a 5 × el tipo de cambio `paralelo`.
  const x = grupo(page, 'gx')
  await x.getByRole('button', { name: `Editar el grupo GRUPOX-${MARCA}` }).click()
  await x.getByLabel('Sumar una fila').selectOption('con_ayuda')
  await x.getByRole('button', { name: 'Sumar', exact: true }).click()
  await x.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(x).toContainText('Entró «Con ayuda» (estaba en Pública).')
  await expect(fila(page, 'con_ayuda')).toContainText(`Grupo: GRUPOX-${MARCA}`)
  await expect(previa(page)).toContainText(enBs(5 * tipoDeCambio('paralelo')))

  // (3) Guardar el borrador escribe el plazo, el tono y el grupo nuevo de la fila.
  await editor(page).getByRole('button', { name: 'Guardar el borrador', exact: true }).click()
  await expect(editor(page).locator('[data-guardado] [role="status"]')).toHaveText(
    'Se guardó el borrador.',
  )
  const borrador = leerBorrador(origen.id)
  const definicion = borrador?.definicion as unknown as {
    nodos: { id: string; grupo?: string }[]
    grupos: { id: string; plazo?: string; tono: string }[]
  }
  expect(definicion.grupos.find((g) => g.id === 'gpub')).toMatchObject({
    plazo: '3 días',
    tono: otroTono,
  })
  expect(definicion.nodos.find((n) => n.id === 'con_ayuda')?.grupo).toBe('gx')
})
