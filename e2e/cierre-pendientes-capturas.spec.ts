import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarPersonasDePrueba, crearPersona, DOMINIO_E2E } from './soporte/base'
import { buscar, irALeads } from './soporte/leads-listado'
import { irAFicha } from './soporte/leads-ficha'
import { borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import {
  PREFIJO_DE_ORIGEN_E2E,
  borrarOrigenesDePrueba,
  sembrarOrigen,
} from './soporte/origenes-de-lead'
import {
  capturar,
  limpiarRecorrido,
  prepararRecorrido,
  textoGrandeAlCargar,
  type TerrenoDelRecorrido,
} from './soporte/recorrido'
import { sql } from './soporte/sql'

// Las capturas de la sesión «cierre de pendientes del 200 %» (`E2E_CAPTURAS=e2e-capturas/cierre-pendientes/{antes,despues}`): 5a-22 (la ficha y
// el resumen con un origen inactivo de nombre largo), 5a-23 (el chip de una búsqueda de 22 letras), 5a-24 (el selector de iconos arriba y abajo,
// y el mismo modal al 100 %, donde cabe), el ancho de «Persona» en el equipo, el interruptor «Activa» de Integraciones y las tres pestañas del
// origen con su barra a la vista. Al 100 % y al 200 %. Sin asserts: lo que se afirma vive en `leads-ficha-origen-inactivo-200`,
// `barra-de-filtros-200`, `modal-desborde-200` y `equipo-200`; este recorre y deja las imágenes, y corre igual contra el código de antes.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'
const LARGO =
  'Subasta internacional de vehículos livianos y pesados de Norteamérica y del Asia oriental'
const CORREO_DE_38 = `${'c'.repeat(17)}@${DOMINIO_E2E}`

let r: TerrenoDelRecorrido
let origen = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  r = await prepararRecorrido(proyecto, 'CP')
  origen = await crearOrigenDePrueba(LARGO, `largo_cierre_${proyecto}`)
  await crearPersona({
    email: CORREO_DE_38,
    contrasena: CLAVE,
    nombre: 'Maria de los Angeles Fernandez de Cordoba y Sanchez de la Vega',
    invitada: true,
  })
  const inactivo = await sembrarOrigen(
    `${PREFIJO_DE_ORIGEN_E2E} origen inactivo con un nombre tan largo que no cabe ni en escritorio ${proyecto}`,
  )
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

type Info = Parameters<typeof capturar>[1]

async function selectorDeIconos(page: Page, info: Info, zoom: string) {
  await page.goto('/configuracion/leads?seccion=seguimientos')
  await page.getByRole('button', { name: 'Nuevo tipo' }).first().click()
  const modal = page.getByRole('dialog', { name: 'Nuevo tipo de seguimiento' })
  await expect(modal).toBeVisible()
  await capturar(page, info, `selector-de-iconos-arriba-${zoom}`)
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
  test(`el cierre de pendientes al ${zoom} %`, async ({ page }, info) => {
    if (zoom === '200') await textoGrandeAlCargar(page)
    await entrar(page, r.t.personas.duena)

    // «Persona» y el correo de 38 letras.
    await page.goto('/configuracion/equipo')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(CORREO_DE_38, { exact: true }).first()).toBeVisible()
    await capturar(page, info, `equipo-${zoom}`)

    // 5a-22: la ficha y el resumen con el origen inactivo de nombre largo.
    await irAFicha(page, r.uno.id)
    await expect(page.getByText('(inactivo)').first()).toBeVisible()
    await capturar(page, info, `ficha-con-origen-inactivo-${zoom}`)
    await page.goto(`/leads?lead=${r.uno.id}`)
    await expect(page.getByRole('dialog', { name: r.uno.nombre })).toBeVisible()
    await capturar(page, info, `resumen-con-origen-inactivo-${zoom}`)

    // 5a-23: el chip de una búsqueda de 22 letras.
    await irALeads(page, buscar('E2E Menu mas acciones'))
    await expect(page.getByRole('button', { name: /^Quitar el filtro / }).first()).toBeVisible()
    await capturar(page, info, `listado-con-busqueda-larga-${zoom}`)

    // El interruptor «Activa» de Integraciones, pegado a la derecha de su tarjeta en el celular al 200 %.
    await page.goto('/configuracion/empresa?seccion=integraciones')
    await expect(page.getByRole('switch', { name: 'Activa' })).toBeVisible()
    await page.getByRole('switch', { name: 'Activa' }).scrollIntoViewIfNeeded()
    await capturar(page, info, `integraciones-activa-${zoom}`)

    // Las pestañas del origen, una por una, con su barra a la vista (queda bajo el título largo).
    for (const [pestana, clave] of [
      ['Datos', 'datos'],
      ['Campos', 'campos'],
      ['Categorías', 'categorias'],
    ] as const) {
      await page.goto(`/configuracion/origenes/${origen.id}?seccion=${clave}`)
      const barra = page.getByRole('tab', { name: pestana })
      await expect(barra).toBeVisible()
      await barra.scrollIntoViewIfNeeded()
      await capturar(page, info, `origen-${clave}-${zoom}`)
    }

    // 5a-24: el modal que desborda al 200 % y el mismo, entero, al 100 %.
    await selectorDeIconos(page, info, zoom)
  })
}
