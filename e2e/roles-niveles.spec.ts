import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  concesionesDelRol,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { esMovil } from './soporte/inventario'
import {
  PREFIJO_DE_NIVEL_E2E,
  borrarNivelesDePrueba,
  llenarNivelesHasta,
  nivelEnLaBase,
  sembrarNivel,
} from './soporte/niveles'
import { borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import { aLaVistaSinDesplazar, capturar, sinScrollHorizontal } from './soporte/recorrido'
import { sesionDe } from './soporte/leads-alta'
import { literal, sql } from './soporte/sql'

// Los permisos de un nivel de acceso en la matriz de Roles (paso 4.09-2): aparecen en «Cotizaciones» con el nombre del nivel, en su orden, se dan por
// origen con `rbac_otorgar`, «Ver como» los refleja, y con el tope de niveles (18 filas más) la matriz sigue cabiendo al 200 % en los dos anchos.
test.describe.configure({ mode: 'serial' })

let duena = ''
let proyecto = ''
let rol = ''
let gestiona = ''
let origen = { id: '', nombre: '' }
const nombre = (resto: string) => `${PREFIJO_DE_NIVEL_E2E} ${resto} ${proyecto}`
const DUENA = 'Dalia Niveles Roles'

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarNivelesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await borrarOrigenes([])
  origen = await crearOrigenDePrueba('Origen de los niveles', 'niveles')
  duena = correoDePrueba(`duena-roles-niveles-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: DUENA })
  rol = `${PREFIJO_ROL_E2E}Niveles ${proyecto}`
  gestiona = `${PREFIJO_ROL_E2E}Gestiona roles ${proyecto}`
  sql(`
    insert into public.roles (nombre, clave) values (${literal(rol)}, ${literal(`e2e_niveles_${proyecto}`)});
    with r as (insert into public.roles (nombre, clave) values (${literal(gestiona)}, ${literal(`e2e_gestiona_${proyecto}`)}) returning id)
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
      select id, c, null, 'todos' from r, unnest(array['equipo.roles.ver', 'equipo.roles.gestionar']) c;
  `)
  sembrarNivel(nombre('Alfa'))
  sembrarNivel(nombre('Beta'))
  sembrarNivel(nombre('Gamma'), { retirado: true })
})

test.afterAll(async () => {
  borrarNivelesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await borrarOrigenes([])
})

async function abrirMatriz(page: Page, rolAVer: string | null = rol) {
  await page.goto('/configuracion/roles')
  await expect(page.getByRole('heading', { name: 'Roles y permisos' })).toBeVisible()
  if (rolAVer !== null && esMovil(page)) {
    await page.getByLabel('Rol a la vista').selectOption({ label: rolAVer })
  }
}

const filasDeNivel = (page: Page) => page.locator('[data-permiso^="cotizaciones.nivel."]')

async function clavesDeLasFilas(page: Page, selector: string): Promise<string[]> {
  const filas = await page.locator(selector).all()
  const claves: string[] = []
  for (const fila of filas) {
    claves.push((await fila.getAttribute('data-permiso')) ?? '')
  }
  return claves
}

test('los permisos de cada nivel están en «Cotizaciones», por nombre y «Ver» antes de «Editar», y el retirado lo dice', async ({
  page,
}, info) => {
  await entrar(page, duena)
  await abrirMatriz(page)
  const claves = await clavesDeLasFilas(page, '[data-permiso^="cotizaciones."]')
  const alfa = nivelEnLaBase(nombre('Alfa'))?.clave ?? ''
  const beta = nivelEnLaBase(nombre('Beta'))?.clave ?? ''
  const gamma = nivelEnLaBase(nombre('Gamma'))?.clave ?? ''
  const de = (clave: string) => [
    `cotizaciones.nivel.${clave}.ver`,
    `cotizaciones.nivel.${clave}.editar`,
  ]
  // «Costos» es de fábrica; después los de prueba, por nombre. Los de nivel van al final del grupo, después de los demás de «Cotizaciones».
  const deNivel = claves.filter((c) => c.startsWith('cotizaciones.nivel.'))
  expect(deNivel).toEqual([...de('costos'), ...de(alfa), ...de(beta), ...de(gamma)])
  const primeroDeNivel = claves.findIndex((c) => c.startsWith('cotizaciones.nivel.'))
  expect(claves.slice(0, primeroDeNivel).length).toBeGreaterThan(0)
  expect(claves.slice(0, primeroDeNivel).every((c) => !c.startsWith('cotizaciones.nivel.'))).toBe(
    true,
  )

  // Cada fila lleva el nombre del nivel (de la fila del nivel, nunca de un texto fijo) y el retirado lo dice.
  const nombres = await filasDeNivel(page).locator('[data-nombre-de-permiso]').allTextContents()
  expect(nombres.map((n) => n.trim())).toEqual([
    'Ver el nivel «Costos»',
    'Editar el nivel «Costos»',
    `Ver el nivel «${nombre('Alfa')}»`,
    `Editar el nivel «${nombre('Alfa')}»`,
    `Ver el nivel «${nombre('Beta')}»`,
    `Editar el nivel «${nombre('Beta')}»`,
    `Ver el nivel «${nombre('Gamma')}» (retirado)`,
    `Editar el nivel «${nombre('Gamma')}» (retirado)`,
  ])
  await filasDeNivel(page).first().scrollIntoViewIfNeeded()
  await capturar(page, info, 'matriz-con-niveles')
})

test('otorgar un permiso de nivel a un rol, en todos los orígenes o en uno: pasa por rbac_otorgar y queda en la base', async ({
  page,
}) => {
  const alfa = nivelEnLaBase(nombre('Alfa'))?.clave ?? ''
  const ver = `Ver el nivel «${nombre('Alfa')}»`
  const editar = `Editar el nivel «${nombre('Alfa')}»`
  await entrar(page, duena)
  await abrirMatriz(page)

  // En un origen.
  await page.getByRole('button', { name: `${ver} para ${rol}: No. Cambiar` }).click()
  const enElOrigen = page.getByRole('switch', {
    name: `${ver} para ${rol}: ${origen.nombre}`,
    exact: true,
  })
  await enElOrigen.click()
  await expect(enElOrigen).toBeChecked()
  await page.keyboard.press('Escape')
  await expect
    .poll(async () => await concesionesDelRol(rol))
    .toContainEqual({
      permiso_clave: `cotizaciones.nivel.${alfa}.ver`,
      origen_id: origen.id,
      alcance: 'todos',
    })

  // En todos los orígenes (sin alcance «propios»: un nivel no lo tiene).
  await page.getByRole('button', { name: `${editar} para ${rol}: No. Cambiar` }).click()
  const entodos = page.getByRole('switch', {
    name: `${editar} para ${rol}: Todos los orígenes`,
    exact: true,
  })
  await entodos.click()
  await expect(entodos).toBeChecked()
  await expect(page.getByRole('radio', { name: /propio/i })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect
    .poll(async () => await concesionesDelRol(rol))
    .toContainEqual({
      permiso_clave: `cotizaciones.nivel.${alfa}.editar`,
      origen_id: null,
      alcance: 'todos',
    })
  expect(await concesionesDelRol(rol)).toHaveLength(2)
})

test('renombrar un nivel cambia el nombre de sus dos filas en la matriz, y quitarle el permiso al rol lo revoca', async ({
  page,
}) => {
  const beta = nivelEnLaBase(nombre('Beta'))
  const cliente = await sesionDe(duena, CONTRASENA)
  const r = await cliente.rpc('nivel_renombrar', {
    p_id: beta?.id ?? '',
    p_actualizado_en_esperado: beta?.actualizado_en ?? '',
    p_nombre: nombre('Beta nuevo'),
  })
  expect(r.error).toBeNull()
  await entrar(page, duena)
  await abrirMatriz(page)
  await expect(
    page.locator('[data-nombre-de-permiso]', { hasText: `Ver el nivel «${nombre('Beta nuevo')}»` }),
  ).toBeVisible()
  await expect(
    page.locator('[data-nombre-de-permiso]', { hasText: `«${nombre('Beta')}»` }),
  ).toHaveCount(0)

  // Revocar el de «Alfa» en el origen: el switch del origen se apaga y la concesión sale.
  const ver = `Ver el nivel «${nombre('Alfa')}»`
  await page.getByRole('button', { name: new RegExp(`^${ver} para ${rol}: .*Cambiar$`) }).click()
  const enElOrigen = page.getByRole('switch', {
    name: `${ver} para ${rol}: ${origen.nombre}`,
    exact: true,
  })
  await expect(enElOrigen).toBeChecked()
  await enElOrigen.click()
  await expect(enElOrigen).not.toBeChecked()
  await page.keyboard.press('Escape')
  await expect
    .poll(async () => (await concesionesDelRol(rol)).map((c) => c.permiso_clave))
    .not.toContain(`cotizaciones.nivel.${nivelEnLaBase(nombre('Alfa'))?.clave ?? ''}.ver`)
})

test('«Ver como» un rol que gestiona roles pero no tiene el permiso del nivel: no se lo puede dar, y no toca a un rol que ya lo tiene', async ({
  page,
}, info) => {
  const verComoRol = async (nombreDelRol: string | null) => {
    await page.getByRole('button', { name: `Menú de ${DUENA}` }).click()
    const opcion = page.getByRole('menuitemradio', { name: nombreDelRol ?? 'Yo, con mis permisos' })
    await opcion.click()
    await expect(opcion).toBeChecked()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toBeHidden()
  }
  const alfa = nivelEnLaBase(nombre('Alfa'))?.clave ?? ''
  const editar = `Editar el nivel «${nombre('Alfa')}»`
  await entrar(page, duena)
  await verComoRol(gestiona)

  // Un rol que no tiene el permiso: la fila está, el popover abre y los interruptores salen apagados (nadie otorga lo que no tiene).
  await abrirMatriz(page, gestiona)
  await expect(page.locator(`[data-permiso="cotizaciones.nivel.${alfa}.editar"]`)).toBeVisible()
  await page.getByRole('button', { name: `${editar} para ${gestiona}: No. Cambiar` }).click()
  for (const lugar of ['Todos los orígenes', origen.nombre]) {
    await expect(
      page.getByRole('switch', { name: `${editar} para ${gestiona}: ${lugar}`, exact: true }),
    ).toBeDisabled()
  }
  await capturar(page, info, 'matriz-ver-como-sin-el-nivel')
  await page.keyboard.press('Escape')

  // Un rol que ya lo tiene (y que la perspectiva no domina): sólo se lee, sin control.
  await abrirMatriz(page, rol)
  await expect(page.locator(`[data-permiso="cotizaciones.nivel.${alfa}.editar"]`)).toBeVisible()
  await expect(
    page.getByRole('button', { name: new RegExp(`^${editar} para ${rol}: `) }),
  ).toHaveCount(0)
  await verComoRol(null)
})

test('con el tope de niveles (18 filas más) la matriz no ensancha la página y cada control cabe al 200 %', async ({
  page,
}, info) => {
  llenarNivelesHasta(10)
  await entrar(page, duena)
  await abrirMatriz(page)
  const filas = page.locator('[data-permiso]')
  const total = await filas.count()
  const deNivel = await filasDeNivel(page).count()
  expect(deNivel).toBe(18)
  expect(total).toBeGreaterThanOrEqual(72 + 18)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await sinScrollHorizontal(page)
  // Las filas de nivel: el nombre y el control de la primera, de una del medio y de la última.
  for (const indice of [0, 1, 8, 16, 17]) {
    const fila = filasDeNivel(page).nth(indice)
    await fila.scrollIntoViewIfNeeded()
    const clave = (await fila.getAttribute('data-permiso')) ?? String(indice)
    await aLaVistaSinDesplazar(fila.locator('[data-nombre-de-permiso]'), `el nombre de ${clave}`)
    const control = fila
      .getByRole('switch')
      .or(fila.getByRole('button', { name: /Cambiar$/ }))
      .first()
    await aLaVistaSinDesplazar(control, `el control de ${clave}`)
  }
  await filasDeNivel(page).first().scrollIntoViewIfNeeded()
  await capturar(page, info, 'matriz-con-tope-de-niveles-200')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = ''
  })
})
