// El terreno de los e2e del inventario: dos orígenes de prueba (uno con vehículos y un layout con
// opciones), tres personas con distinto alcance, y los pasos que repiten los dos specs.
import { expect, type Browser, type Locator, type Page } from '@playwright/test'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  personasAjenas,
  type PermisoDePrueba,
} from './base'
import { PREFIJO_CLAVE_E2E, borrarOrigenes, crearOrigenDePrueba } from './origenes'
import { ingresar } from './pasos'
import { agregarCampo, borrarVehiculosDe, cargarVehiculos, ponerOpciones } from './vehiculos'
import { borrarLotesDePrueba } from './papelera'
import { borrarFasesDe } from './vitrina'

export const CLAVE = 'una-clave-de-prueba-9'
export const COREA = 'Corea'
export const TAIWAN = 'Taiwán'
const CLAVES_DE_ORIGEN = [`${PREFIJO_CLAVE_E2E}corea_inv`, `${PREFIJO_CLAVE_E2E}taiwan_inv`]

export type Terreno = {
  // Ve, da de alta y edita vehículos en todos los orígenes.
  duena: string
  // Ve, da de alta y edita vehículos sólo en Corea.
  soloCorea: string
  // Tiene un rol, pero ningún permiso sobre vehículos.
  sinPermisos: string
  corea: { id: string; nombre: string }
  taiwan: { id: string; nombre: string }
}

// Sólo lo que crean estos e2e: sus orígenes (con sus vehículos), sus personas y sus roles.
export async function limpiarInventario(): Promise<void> {
  await borrarVehiculosDe(CLAVES_DE_ORIGEN)
  await borrarFasesDe(CLAVES_DE_ORIGEN)
  await borrarOrigenes(CLAVES_DE_ORIGEN)
  await borrarLotesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
}

// El origen donde se prueba casi todo: un layout con opciones, un sí o no y un número con valor
// por defecto, y tres vehículos ya cargados para filtrar.
async function armarCorea(coreaId: string): Promise<void> {
  // El layout manual trae «Transmisión» sin opciones: se le ponen, y se suman un sí o no y un número.
  await ponerOpciones(coreaId, 'transmision', [
    { clave: 'automatica', etiqueta: 'Automática' },
    { clave: 'manual', etiqueta: 'Manual' },
  ])
  await agregarCampo(coreaId, {
    clave: 'tiene_llave',
    etiqueta: 'Tiene llave',
    tipo: 'booleano',
    grupo: 'Venta',
    filtrable: true,
  })
  await agregarCampo(coreaId, {
    clave: 'puertas',
    etiqueta: 'Puertas',
    tipo: 'numero',
    grupo: 'Vehículo',
    filtrable: true,
    en_tarjeta: true,
    // Lo que el formulario de alta trae puesto.
    valor_defecto: 5,
  })
  await cargarVehiculos(coreaId, [
    {
      titulo: 'Kia Morning, base (2019)',
      anio: 2019,
      atributos: { color: 'Rojo', transmision: 'manual', tiene_llave: true, puertas: 5 },
    },
    {
      titulo: 'Hyundai Tucson 100%',
      anio: 2021,
      atributos: { color: 'Gris perla', transmision: 'automatica', tiene_llave: false, puertas: 5 },
    },
    {
      titulo: 'Kia Sportage',
      anio: 2023,
      atributos: { color: 'Blanco', transmision: 'automatica', puertas: 3 },
    },
  ])
}

// `ademas`: los permisos que la dueña de prueba suma a los del inventario (vitrina, papelera).
export async function prepararInventario(
  proyecto: string,
  ademas: PermisoDePrueba[] = [],
): Promise<Terreno> {
  await limpiarInventario()
  const duena = correoDePrueba(`duena-inventario-${proyecto}`)
  const soloCorea = correoDePrueba(`solo-corea-${proyecto}`)
  const sinPermisos = correoDePrueba(`sin-inventario-${proyecto}`)
  // No hace falta el equipo vacío. Si ya hay alguien (quien usa la app local), quien administra el
  // inventario acá entra invitada, con un rol que lo puede todo sobre vehículos. Con el equipo
  // vacío es la primera: nace dueña (una invitada pendiente no alcanza para el guardián).
  const hayEquipo = (await personasAjenas()) > 0
  await crearPersona({
    email: duena,
    contrasena: CLAVE,
    nombre: 'Dalia Prueba',
    invitada: hayEquipo,
  })
  await darRolDePrueba({
    email: duena,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Inventario ${proyecto}`,
      clave: `e2e_inventario_${proyecto}`,
    },
    permisos: [
      'vehiculos.ver',
      'vehiculos.crear',
      'vehiculos.editar',
      'origenes.gestionar',
      ...ademas,
    ],
  })
  const corea = await crearOrigenDePrueba(COREA, 'corea_inv')
  const taiwan = await crearOrigenDePrueba(TAIWAN, 'taiwan_inv')
  await armarCorea(corea.id)
  await crearPersona({ email: soloCorea, contrasena: CLAVE, nombre: 'Sara Corea', invitada: true })
  await darRolDePrueba({
    email: soloCorea,
    rol: { nombre: `${PREFIJO_ROL_E2E}Corea ${proyecto}`, clave: `e2e_corea_${proyecto}` },
    permisos: [
      { clave: 'vehiculos.ver', origenId: corea.id },
      { clave: 'vehiculos.crear', origenId: corea.id },
      { clave: 'vehiculos.editar', origenId: corea.id },
    ],
  })
  await crearPersona({
    email: sinPermisos,
    contrasena: CLAVE,
    nombre: 'Sin Inventario',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinPermisos,
    rol: { nombre: `${PREFIJO_ROL_E2E}Chat ${proyecto}`, clave: `e2e_chat_${proyecto}` },
    permisos: ['chat.participar'],
  })
  return { duena, soloCorea, sinPermisos, corea, taiwan }
}

export async function entrar(page: Page, correo: string): Promise<void> {
  await page.goto('/ingreso')
  await ingresar(page, correo, CLAVE)
  await expect(page).toHaveURL('/')
}

export const esMovil = (page: Page) => (page.viewportSize()?.width ?? 1280) < 768

// La tabla (escritorio) y las tarjetas (celular) están las dos en la página, y Next conserva
// oculta la pantalla anterior: se mira sólo lo visible.
export const aLaVista = (lugar: Locator) => lugar.filter({ visible: true })

export function vehiculo(page: Page, titulo: string): Locator {
  return aLaVista(page.getByText(titulo, { exact: true }))
}

export async function irAlOrigen(page: Page, origen: { id: string; nombre: string }) {
  await page.goto(`/vehiculos?origen=${origen.id}`)
  await expect(page.getByRole('link', { name: origen.nombre })).toHaveAttribute(
    'aria-current',
    'page',
  )
}

// El panel de filtros: al costado en escritorio, en una hoja inferior en el celular.
export async function panelDeFiltros(page: Page): Promise<Locator> {
  if (esMovil(page)) {
    await page.getByRole('button', { name: /^Filtros/ }).click()
    const hoja = page.getByRole('dialog', { name: 'Filtros' })
    await expect(hoja).toBeVisible()
    return hoja
  }
  return page.getByRole('complementary', { name: 'Filtros' })
}

export async function cerrarPanelDeFiltros(page: Page) {
  if (esMovil(page)) {
    await page.getByRole('button', { name: 'Ver resultados' }).click()
    await expect(page.getByRole('dialog', { name: 'Filtros' })).toBeHidden()
  }
}

// Otra persona, en su propio navegador (sus cookies no se mezclan).
export async function otraPersona(browser: Browser, page: Page): Promise<Page> {
  const contexto = await browser.newContext({
    baseURL: new URL(page.url()).origin,
    viewport: page.viewportSize(),
  })
  return contexto.newPage()
}

// Un aviso tapa lo que hay debajo en un celular: se lo descarta antes de seguir.
export async function descartarAviso(page: Page, texto: string | RegExp) {
  const aviso = page.locator('[data-sonner-toast]').filter({ hasText: texto })
  await expect(aviso).toBeVisible()
  await aviso.getByRole('button', { name: 'Close toast' }).click()
  await expect(aviso).toBeHidden()
}

// El encabezado de un bloque plegable del formulario.
export const bloque = (panel: Locator, titulo: string) =>
  panel.locator('summary').filter({ hasText: new RegExp(`^${titulo}$`) })
