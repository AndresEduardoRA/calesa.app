import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import { cerrarPanelDeFiltros, esMovil, panelDeFiltros } from './soporte/inventario'
import { crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { literal, sql } from './soporte/sql'

// El listado `/cotizaciones` (paso 4.16-4a, `docs/UX.md` › «Cotizaciones»): lo que ve cada quien (la RLS decide), sus filtros en la URL, la paginación por cursor y «Nueva
// cotización». Todo se filtra por el origen de la prueba para no ver lo de otros specs. Sin resumen todavía (4.16-4b): el número de cada fila es el enlace a su página.
test.describe.configure({ mode: 'serial' })

let origen = { id: '', nombre: '' }
let duena = ''
let ana = ''
let soloVer = ''
let sinVer = ''
let leadDeLaDuena = ''
let leadDeAna = ''
let nombreDelLeadDeLaDuena = ''
let nombreDelLeadDeAna = ''
const vehiculos = { uno: '', dos: '' }
const TITULO_UNO = 'Listado Hilux uno'
const TITULO_DOS = 'Listado Hilux dos'

function crearVehiculo(titulo: string): string {
  sql(
    `insert into public.vehiculos (origen_id, titulo) values (${literal(origen.id)}::uuid, ${literal(titulo)})`,
  )
  return sql(
    `select id from public.vehiculos where origen_id = ${literal(origen.id)}::uuid and titulo = ${literal(titulo)}`,
  )
}

// Ana (ve y cotiza «propios» y ve leads «propios»), quien sólo ve cotizaciones de todos y quien no las ve.
async function prepararPersonas(proyecto: string): Promise<void> {
  ana = correoDePrueba(`ana-listado-${proyecto}`)
  soloVer = correoDePrueba(`solover-listado-${proyecto}`)
  sinVer = correoDePrueba(`sinver-listado-${proyecto}`)
  for (const [email, nombre] of [
    [ana, 'Ana Propios'],
    [soloVer, 'Vera Sólo Ve'],
    [sinVer, 'Sara Sin Ver'],
  ] as const) {
    await crearPersona({ email, contrasena: CONTRASENA, nombre, invitada: true })
  }
  await darRolDePrueba({
    email: ana,
    rol: { nombre: `${PREFIJO_ROL_E2E}Listado propios`, clave: 'e2e_listado_propios' },
    permisos: [
      { clave: 'leads.ver', alcance: 'propios' },
      'cotizaciones.crear',
      { clave: 'cotizaciones.ver', origenId: origen.id, alcance: 'propios' },
    ],
  })
  await darRolDePrueba({
    email: soloVer,
    rol: { nombre: `${PREFIJO_ROL_E2E}Listado sólo ve`, clave: 'e2e_listado_solo_ve' },
    permisos: [{ clave: 'cotizaciones.ver', origenId: origen.id, alcance: 'todos' }],
  })
  await darRolDePrueba({
    email: sinVer,
    rol: { nombre: `${PREFIJO_ROL_E2E}Listado sin ver`, clave: 'e2e_listado_sin_ver' },
    permisos: ['vehiculos.ver'],
  })
}

const nombreDelLead = (id: string): string =>
  sql(`select nombre from public.leads where id = ${literal(id)}::uuid`)

// La dueña: tres preventas con lead y vehículo, una final en otro vehículo, una vieja sin vehículo (10 días: vencida con los 7 de vigencia) y doce más, para tener más de
// una página de a 10. Ana: dos, sobre su propio lead.
function sembrarTodo(): void {
  const deLaDuena = idDePersona(duena)
  const deAna = idDePersona(ana)
  const base = { origenId: origen.id, leadId: leadDeLaDuena, creadoPor: deLaDuena }
  sembrarCotizaciones({ ...base, vehiculoId: vehiculos.uno, cuantas: 3 })
  sembrarCotizaciones({
    ...base,
    vehiculoId: vehiculos.dos,
    cuantas: 1,
    clase: 'final',
    desde: 5,
  })
  sembrarCotizaciones({ ...base, cuantas: 1, desde: 14_400 })
  sembrarCotizaciones({ ...base, cuantas: 12, desde: 30 })
  sembrarCotizaciones({
    origenId: origen.id,
    vehiculoId: vehiculos.uno,
    leadId: leadDeAna,
    creadoPor: deAna,
    cuantas: 2,
    desde: 10,
  })
}

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarRolesDePrueba()
  ;({ origen, duena, lead: leadDeLaDuena } = await prepararGuardado(proyecto, 'listado'))
  await prepararPersonas(proyecto)
  leadDeAna = await crearLead({
    nombre: `listado ana ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: ana,
  })
  nombreDelLeadDeLaDuena = nombreDelLead(leadDeLaDuena)
  nombreDelLeadDeAna = nombreDelLead(leadDeAna)
  vehiculos.uno = crearVehiculo(TITULO_UNO)
  vehiculos.dos = crearVehiculo(TITULO_DOS)
  sembrarTodo()
})

test.afterAll(async () => {
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const filas = (page: Page): Locator =>
  page.locator('tbody tr, li article').filter({ visible: true })
const enElOrigen = (): string => `/cotizaciones?origen=${origen.id}`
const numeroDeLaVieja = (): string =>
  sql(
    `select numero from public.cotizaciones where origen_id = ${literal(origen.id)}::uuid and creado_en < now() - interval '5 days'`,
  )

async function irAlListado(page: Page, correo: string, consulta = ''): Promise<void> {
  await entrar(page, correo, { fresco: true })
  await page.goto(`${enElOrigen()}${consulta}`)
  await expect(filas(page).first()).toBeVisible()
}

async function elegir(page: Page, grupo: string, opcion: string): Promise<void> {
  const panel = await panelDeFiltros(page)
  await panel.getByRole('group', { name: grupo }).getByRole('radio', { name: opcion }).check()
  await cerrarPanelDeFiltros(page)
}

test('E1 la dueña ve Cotizaciones en el menú y cada fila con su cliente, vehículo, clase, total y vigencia', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  if (esMovil(page)) {
    await page.getByRole('button', { name: 'Abrir el menú' }).click()
  }
  await page
    .getByRole('link', { name: 'Cotizaciones', exact: true })
    .filter({ visible: true })
    .click()
  await expect(page).toHaveURL(/\/cotizaciones$/)
  await page.goto(enElOrigen())
  await expect(filas(page)).toHaveCount(19)

  const vieja = filas(page).filter({ hasText: `N.º ${numeroDeLaVieja()}` })
  await expect(vieja).toContainText('Vencida')
  // Sin vehículo, «—»; el cliente es el de la cotización.
  await expect(vieja).toContainText(nombreDelLeadDeLaDuena)
  await expect(vieja).toContainText('—')

  const conVehiculo = filas(page).filter({ hasText: TITULO_UNO }).first()
  await expect(conVehiculo).toContainText(nombreDelLeadDeLaDuena)
  await expect(conVehiculo).toContainText('Preventa')
  await expect(conVehiculo).toContainText(origen.nombre)
  await expect(conVehiculo).toContainText('Vale hasta el')
  await expect(conVehiculo).toContainText('Gala Guarda')
  await expect(conVehiculo.getByText(/\d/).first()).toBeVisible()

  // El número lleva a la página de su cotización.
  await vieja.getByRole('link', { name: /^N\.º / }).click()
  await expect(page).toHaveURL(/\/cotizaciones\/[0-9a-f-]{36}$/)
})

test('E2 los filtros de Clase y Cuáles acotan la lista, «Limpiar» la devuelve y escribir un filtro vuelve a la primera página', async ({
  page,
}) => {
  await irAlListado(page, duena, '&por=10')
  await elegir(page, 'Clase', 'Final')
  await expect(page).toHaveURL(/clase=final/)
  await expect(filas(page)).toHaveCount(1)
  await expect(filas(page).first()).toContainText('Final')

  await page.getByRole('button', { name: 'Limpiar' }).click()
  await expect(page).not.toHaveURL(/clase=/)
  await expect(filas(page)).toHaveCount(10)

  // «Mías»: las de la dueña, ninguna de Ana.
  await elegir(page, 'Cuáles', 'Mías')
  await expect(page).toHaveURL(/cuales=mias/)
  await expect(filas(page)).toHaveCount(10)
  await expect(filas(page).filter({ hasText: 'Ana Propios' })).toHaveCount(0)

  // Desde la página 2, cambiar un filtro quita el cursor y vuelve a la primera.
  await page.getByRole('link', { name: 'Siguiente' }).filter({ visible: true }).click()
  await expect(page).toHaveURL(/cursor=/)
  await elegir(page, 'Clase', 'Preventa')
  await expect(page).toHaveURL(/clase=preventa/)
  await expect(page).not.toHaveURL(/cursor=/)
})

test('E3 de a 10, Siguiente y Anterior caminan por cursor y un cursor sin filas lo dice', async ({
  page,
}) => {
  await irAlListado(page, duena, '&por=10')
  await expect(filas(page)).toHaveCount(10)
  await page.getByRole('link', { name: 'Siguiente' }).filter({ visible: true }).click()
  await expect(page).toHaveURL(/cursor=/)
  await expect(filas(page)).toHaveCount(9)
  await expect(page.getByRole('link', { name: 'Siguiente' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Anterior' }).filter({ visible: true }).click()
  await expect(filas(page)).toHaveCount(10)

  // El cursor «siguiente» desde la cotización más vieja de toda la base, sin filtros: ya no hay nada después (con un filtro puesto, el estado es «Nada coincide»).
  const [instante, id] = sql(
    `select to_char(creado_en at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US"+00:00"') || '|' || id from public.cotizaciones order by creado_en asc, id asc limit 1`,
  ).split('|')
  const cursor = Buffer.from(`s|${instante ?? ''}|${id ?? ''}`).toString('base64url')
  await page.goto(`/cotizaciones?por=10&cursor=${cursor}`)
  await expect(page.getByText('No hay más en esta página')).toBeVisible()
})

test('E4 quien ve «propios» ve las suyas, con su cliente, y no las de la dueña sobre un lead que no es suyo', async ({
  page,
}) => {
  await irAlListado(page, ana)
  await expect(filas(page)).toHaveCount(2)
  await expect(filas(page).first()).toContainText(nombreDelLeadDeAna)
  await expect(filas(page).first()).toContainText('Ana Propios')
  await expect(page.getByText(nombreDelLeadDeLaDuena)).toHaveCount(0)
  await expect(page.getByText('Gala Guarda')).toHaveCount(0)
})

test('E5 sin ver leads, el cliente es «—» y su nombre no está en la página', async ({ page }) => {
  await irAlListado(page, soloVer)
  await expect(filas(page).first()).toContainText('—')
  await expect(page.getByText(nombreDelLeadDeLaDuena)).toHaveCount(0)
})

test('E5b sin ver cotizaciones, ni la entrada en el menú ni la lista', async ({ page }) => {
  await entrar(page, sinVer, { fresco: true })
  if (esMovil(page)) {
    await page.getByRole('button', { name: 'Abrir el menú' }).click()
  }
  await expect(page.getByRole('link', { name: 'Cotizaciones', exact: true })).toHaveCount(0)
  await page.goto('/cotizaciones')
  await expect(
    page.getByText('No tienes permiso para ver cotizaciones en ningún origen.'),
  ).toBeVisible()
})

test('E6 «Nueva cotización» abre la hoja en el origen del filtro y la tecla N hace lo mismo', async ({
  page,
}) => {
  await irAlListado(page, duena)
  const nueva = page.getByRole('link', { name: 'Nueva cotización' }).filter({ visible: true })
  await expect(nueva).toHaveAttribute('href', new RegExp(`^/cotizaciones/nuevo\\?origen=`))
  await nueva.click()
  await expect(page).toHaveURL(/\/cotizaciones\/nuevo\?origen=/)

  if (!esMovil(page)) {
    await page.goto(enElOrigen())
    await expect(filas(page).first()).toBeVisible()
    await page.locator('body').press('n')
    await expect(page).toHaveURL(/\/cotizaciones\/nuevo\?origen=/)
  }
})

test('E6b quien ve y no cotiza no tiene «Nueva cotización»', async ({ page }) => {
  await irAlListado(page, soloVer)
  await expect(page.getByRole('link', { name: 'Nueva cotización' })).toHaveCount(0)
})
