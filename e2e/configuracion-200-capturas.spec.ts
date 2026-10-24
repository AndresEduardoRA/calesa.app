import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearPersona } from './soporte/base'
import { borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import {
  PREFIJO_DE_ORIGEN_E2E,
  borrarOrigenesDePrueba,
  sembrarOrigen,
} from './soporte/origenes-de-lead'
import { irAFicha } from './soporte/leads-ficha'
import { sql } from './soporte/sql'
import {
  capturar,
  limpiarRecorrido,
  prepararRecorrido,
  textoGrandeAlCargar,
  type TerrenoDelRecorrido,
} from './soporte/recorrido'

// Las capturas de la sesión de defectos al 200 % (`E2E_CAPTURAS=e2e-capturas/defectos-200/{antes,despues}`): cada pantalla de Configuración,
// el menú de cada persona del equipo, la matriz de Roles, el interruptor, el selector de iconos desplazado y la ficha de un lead con el
// origen inactivo, al 100 % y al 200 %. Sin asserts: lo que se puede afirmar vive en `configuracion-200`, `interruptor-200` y `equipo`; este
// recorre y deja las imágenes para juzgar mirando, y tiene que poder correr contra el código de antes del arreglo.
test.describe.configure({ mode: 'serial' })

const LARGO =
  'Subasta internacional de vehículos livianos y pesados de Norteamérica y del Asia oriental'
const PERSONA_LARGA = 'Maria de los Angeles Fernandez de Cordoba y Sanchez de la Vega'

let r: TerrenoDelRecorrido
let origen = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'D200')
  origen = await crearOrigenDePrueba(LARGO, `largo_capturas_${info.project.name}`)
  await crearPersona({
    email: correoDePrueba(`una-persona-con-un-correo-muy-largo-del-equipo-${info.project.name}`),
    contrasena: 'una-clave-de-prueba-9',
    nombre: PERSONA_LARGA,
    invitada: true,
  })
  // Un lead cuyo origen está inactivo y tiene icono: lo que arregló 8d0285d (el nombre y «(inactivo)» de corrido).
  // La base no deja asignar un origen ya apagado: se asigna activo y después se apaga.
  const inactivo = await sembrarOrigen(`${PREFIJO_DE_ORIGEN_E2E} inactivo ${info.project.name}`)
  sql(`
    update public.origenes_lead set icono = 'compartir' where id = '${inactivo.id}';
    update public.leads set origen_lead_id = '${inactivo.id}' where id = '${r.uno.id}';
    update public.origenes_lead set activo = false where id = '${inactivo.id}';
  `)
})

test.afterAll(async () => {
  await limpiarRecorrido(r)
  await borrarOrigenesDePrueba()
  await borrarOrigenes([])
  await borrarPersonasDePrueba()
})

const PANTALLAS = [
  ['hub', () => '/configuracion'],
  ['empresa-empresa', () => '/configuracion/empresa?seccion=empresa'],
  ['empresa-monedas', () => '/configuracion/empresa?seccion=monedas'],
  ['empresa-integraciones', () => '/configuracion/empresa?seccion=integraciones'],
  ['origenes', () => '/configuracion/origenes'],
  ['origen-datos', () => `/configuracion/origenes/${origen.id}?seccion=datos`],
  ['origen-campos', () => `/configuracion/origenes/${origen.id}?seccion=campos`],
  ['origen-categorias', () => `/configuracion/origenes/${origen.id}?seccion=categorias`],
  ['leads-campos', () => '/configuracion/leads?seccion=campos'],
  ['leads-origenes', () => '/configuracion/leads?seccion=origenes'],
  ['leads-tipos', () => '/configuracion/leads?seccion=tipos'],
  ['leads-seguimientos', () => '/configuracion/leads?seccion=seguimientos'],
  ['cotizacion-niveles', () => '/configuracion/cotizacion?seccion=niveles'],
  ['equipo', () => '/configuracion/equipo'],
  ['roles', () => '/configuracion/roles'],
] as const

// Al 100 % sólo lo que cambia: el resto no se mueve.
const AL_CIEN = new Set([
  'empresa-monedas',
  'empresa-integraciones',
  'origen-datos',
  'equipo',
  'roles',
])

async function selectorDeIconos(page: Page, info: Parameters<typeof capturar>[1], zoom: string) {
  await page.goto('/configuracion/leads?seccion=seguimientos')
  await page.getByRole('button', { name: 'Nuevo tipo' }).first().click()
  const modal = page.getByRole('dialog', { name: 'Nuevo tipo de seguimiento' })
  await expect(modal).toBeVisible()
  await capturar(page, info, `selector-de-iconos-arriba-${zoom}`)
  // El cuerpo del modal es lo que se desplaza: su pie queda fijo.
  await modal.evaluate((m) => {
    const cuerpo = [...m.querySelectorAll<HTMLElement>('*')].find(
      (e) => getComputedStyle(e).overflowY === 'auto' && e.scrollHeight > e.clientHeight,
    )
    if (cuerpo) cuerpo.scrollTop = cuerpo.scrollHeight
  })
  await capturar(page, info, `selector-de-iconos-abajo-${zoom}`)
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
}

for (const zoom of ['100', '200'] as const) {
  test(`Configuración y sus pantallas al ${zoom} %`, async ({ page }, info) => {
    if (zoom === '200') await textoGrandeAlCargar(page)
    await entrar(page, r.t.personas.duena)
    for (const [nombre, url] of PANTALLAS) {
      if (zoom === '100' && !AL_CIEN.has(nombre)) continue
      await page.goto(url())
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      // Las pestañas de un origen quedan bajo el título largo: sin llevar la barra a la vista, las tres capturas eran la misma imagen.
      if (nombre.startsWith('origen-')) {
        await page.getByRole('tablist').first().scrollIntoViewIfNeeded()
      }
      await capturar(page, info, `${nombre}-${zoom}`)
      if (nombre === 'equipo') {
        await page
          .getByRole('button', { name: /^(Acciones sobre|Más acciones de) / })
          .first()
          .click()
        await expect(page.getByRole('menu')).toBeVisible()
        await capturar(page, info, `equipo-menu-${zoom}`)
        await page.keyboard.press('Escape')
        await expect(page.getByRole('menu')).toBeHidden()
      }
      if (nombre === 'roles') {
        // La fila con un interruptor de cerca y, en escritorio, la tabla desplazada hasta el final.
        const turnos = page.locator('[data-permiso="web.cola.participar"]')
        await turnos.scrollIntoViewIfNeeded()
        await capturar(page, info, `roles-turnos-${zoom}`)
        await page.evaluate(() => {
          for (const e of document.querySelectorAll<HTMLElement>('*')) {
            if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === 'auto') {
              e.scrollLeft = e.scrollWidth
            }
          }
        })
        await turnos.scrollIntoViewIfNeeded()
        await capturar(page, info, `roles-desplazada-${zoom}`)
      }
    }
    await selectorDeIconos(page, info, zoom)
    // c.3: la ficha de un lead con el origen inactivo y su icono.
    await irAFicha(page, r.uno.id)
    await expect(page.getByRole('heading', { name: r.uno.nombre, level: 1 })).toBeVisible()
    await expect(page.getByText('(inactivo)').first()).toBeVisible()
    await capturar(page, info, `ficha-con-origen-inactivo-${zoom}`)
  })
}
