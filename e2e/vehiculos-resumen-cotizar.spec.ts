import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import { literal, sql } from './soporte/sql'

// «Cotizar» en el resumen de un vehículo (paso 4.14-2b, `docs/UX.md` › «Cotizar»): con permiso para cotizar en el origen, un enlace a la hoja con ese origen y ese vehículo y sin
// lead (guardar espera al cliente: 4.14-3); sin él, el resumen no lo ofrece.
test.describe.configure({ mode: 'serial' })

const TITULO = 'Resumen para cotizar'
let origen = { id: '', nombre: '' }
let duena = ''
let lectora = ''
let vehiculo = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarRolesDePrueba()
  ;({ origen, duena } = await prepararGuardado(proyecto, 'rescot'))
  lectora = correoDePrueba(`lectora-rescot-${proyecto}`)
  await crearPersona({
    email: lectora,
    contrasena: CONTRASENA,
    nombre: 'Lola Lectora',
    invitada: true,
  })
  await darRolDePrueba({
    email: lectora,
    rol: { nombre: `${PREFIJO_ROL_E2E}Lee sin cotizar`, clave: 'e2e_lee_sin_cotizar' },
    permisos: [{ clave: 'vehiculos.ver', origenId: origen.id }],
  })
  sql(
    `insert into public.vehiculos (origen_id, titulo) values (${literal(origen.id)}::uuid, ${literal(TITULO)})`,
  )
  vehiculo = sql(
    `select id from public.vehiculos where origen_id = ${literal(origen.id)}::uuid and titulo = ${literal(TITULO)}`,
  )
})

test.afterAll(async () => {
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const resumen = (page: Page) => page.getByRole('dialog', { name: TITULO, exact: true })

async function abrirElResumen(page: Page, correo: string): Promise<void> {
  await entrar(page, correo, { fresco: true })
  await page.goto(`/vehiculos?origen=${origen.id}&vehiculo=${vehiculo}`)
  await expect(resumen(page)).toBeVisible()
}

test('E2E «Cotizar» lleva a la hoja de ese origen con el vehículo en la barra, y «Guardar» dice por qué no', async ({
  page,
}) => {
  await abrirElResumen(page, duena)
  const cotizar = resumen(page).getByRole('link', { name: 'Cotizar' })
  await expect(cotizar).toHaveAttribute(
    'href',
    `/cotizaciones/nuevo?origen=${origen.id}&vehiculo=${vehiculo}`,
  )
  await cotizar.click()
  await expect(page).toHaveURL(
    new RegExp(`/cotizaciones/nuevo\\?origen=${origen.id}&vehiculo=${vehiculo}`),
  )
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Vehículo:/ })).toContainText(TITULO)
  await expect(page.getByText('Para guardar, abre la hoja desde un lead.')).toBeVisible()
})

test('E2E con «ver vehículos» y sin «crear cotizaciones», el resumen no ofrece «Cotizar»', async ({
  page,
}) => {
  await abrirElResumen(page, lectora)
  await expect(resumen(page).getByRole('link', { name: 'Abrir ficha' })).toBeVisible()
  await expect(resumen(page).getByRole('link', { name: 'Cotizar' })).toHaveCount(0)
})
