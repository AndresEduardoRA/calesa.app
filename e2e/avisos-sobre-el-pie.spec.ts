import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { aLaVista } from './soporte/inventario'
import { abrirEdicion, irAFicha } from './soporte/leads-ficha'
import { nacional } from './soporte/leads-ficha-telefonos'
import { irALeads, nombre } from './soporte/leads-listado'
import {
  avisoNoTapaElPie,
  capturar,
  limpiarRecorrido,
  prepararRecorrido,
  type TerrenoDelRecorrido,
} from './soporte/recorrido'

// El aviso no tapa el pie de un panel (cierre 3, hallazgo 3): en el alta de lead, el aviso con «Abrir ficha» se dibujaba encima de
// «Cancelar» y «Guardar lead». Los avisos suben sobre el pie mientras haya un panel abierto (`useAvisosSobreElPie()`), con el pie en la
// ranura del `<Drawer>` (el alta) y con el pie dentro del cuerpo (editar el lead), con el texto normal y al 200 %, en claro y en oscuro.
test.describe.configure({ mode: 'serial' })

let r: TerrenoDelRecorrido

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'AvisoPie')
})

test.afterAll(async () => {
  await limpiarRecorrido(r)
})

const alDoscientos = (page: Page) =>
  page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })

// Con la pantalla ya abierta: abre «Nuevo lead», crea uno con Ctrl+S (el panel queda abierto para el siguiente) y devuelve el aviso con «Abrir ficha».
async function altaConAviso(page: Page, corto: string) {
  const alta = page.getByRole('dialog', { name: 'Nuevo lead' })
  await expect(async () => {
    await aLaVista(page.getByRole('button', { name: /^Nuevo lead/ }))
      .first()
      .click()
    await expect(alta).toBeVisible({ timeout: 1000 })
  }).toPass()
  await alta.getByLabel('Teléfono principal').fill(nacional())
  await alta.getByLabel('Nombre').fill(nombre(corto))
  await page.keyboard.press('Control+s')
  const aviso = page.locator('[data-sonner-toast]').filter({ hasText: /Abrir ficha/ })
  await expect(aviso.getByRole('button', { name: 'Abrir ficha' })).toBeVisible()
  return { alta, aviso }
}

const pieDelAlta = (alta: Locator) => alta.locator('[data-slot="sheet-footer"]')

for (const texto of ['normal', 'al 200 %'] as const) {
  test(`el alta de lead: el aviso queda sobre «Cancelar» y «Guardar lead», con el texto ${texto}`, async ({
    page,
  }, info) => {
    await entrar(page, r.ana.email)
    await irALeads(page)
    if (texto === 'al 200 %') {
      await alDoscientos(page)
    }
    const { alta, aviso } = await altaConAviso(
      page,
      `Alta ${texto.slice(0, 3)} ${info.project.name}`,
    )
    if (texto === 'al 200 %') {
      await alDoscientos(page)
    }
    await avisoNoTapaElPie(aviso, pieDelAlta(alta))
    await capturar(page, info, `alta-aviso-${texto === 'normal' ? '100' : '200'}-claro`)
    await page.emulateMedia({ colorScheme: 'dark' })
    await avisoNoTapaElPie(aviso, pieDelAlta(alta))
    await capturar(page, info, `alta-aviso-${texto === 'normal' ? '100' : '200'}-oscuro`)
    await page.emulateMedia({ colorScheme: 'light' })
  })
}

test('con el panel cerrado los avisos vuelven a su lugar de siempre', async ({ page }, info) => {
  await entrar(page, r.ana.email)
  await irALeads(page)
  const { alta, aviso } = await altaConAviso(page, `Alta cierra ${info.project.name}`)
  // Con el aviso ya quieto, sobre el pie (entra deslizándose).
  await avisoNoTapaElPie(aviso, pieDelAlta(alta))
  const conPanel = await aviso.boundingBox()
  await page.keyboard.press('Escape')
  await expect(alta).toHaveCount(0)
  // Sin panel, el margen de abajo es el de siempre (24 px en escritorio, 16 en el celular): el aviso baja.
  await expect
    .poll(async () => (await aviso.boundingBox())?.y ?? 0)
    .toBeGreaterThan((conPanel?.y ?? 0) + 20)
  const margen = await page.evaluate(() => {
    const lista = document.querySelector('[data-sonner-toaster]')
    return lista ? getComputedStyle(lista).getPropertyValue('--offset-bottom') : ''
  })
  expect(margen.trim(), 'el margen de abajo sin panel').toMatch(
    /^var\(--avisos-abajo, 24px\)$|^24px$/,
  )
})

test('editar el lead, con el pie dentro del cuerpo: el aviso no tapa «Cancelar» ni «Guardar»', async ({
  page,
}, info) => {
  await entrar(page, r.ana.email)
  await irAFicha(page, r.dos.id)
  const { alta, aviso } = await altaConAviso(page, `Edita ${info.project.name}`)
  await page.keyboard.press('Escape')
  await expect(alta).toHaveCount(0)
  const panel = await abrirEdicion(page)
  const pie = panel.locator('[data-pie-de-panel]')
  await expect(pie).toBeVisible()
  await avisoNoTapaElPie(aviso, pie)
  await capturar(page, info, 'editar-aviso-claro')
})

test('con el texto al 200 % el aviso crece con él y su icono no tapa el texto', async ({
  page,
}, info) => {
  await entrar(page, r.ana.email)
  await irALeads(page)
  await alDoscientos(page)
  const { alta, aviso } = await altaConAviso(page, `Alta texto ${info.project.name}`)
  // Con el aviso ya quieto (entra deslizándose y translúcido): se mide y se mira en reposo.
  await avisoNoTapaElPie(aviso, pieDelAlta(alta))
  const medidas = await aviso.evaluate((el) => {
    const titulo = el.querySelector('[data-title]')
    const icono = el.querySelector('[data-icon] svg')
    const boton = el.querySelector('[data-button]')
    const caja = (e: Element | null) => e?.getBoundingClientRect()
    return {
      texto: titulo ? Number.parseFloat(getComputedStyle(titulo).fontSize) : 0,
      boton: boton ? Number.parseFloat(getComputedStyle(boton).fontSize) : 0,
      iconoDerecha: caja(icono)?.right ?? Number.POSITIVE_INFINITY,
      textoIzquierda: caja(titulo)?.left ?? 0,
    }
  })
  // 13 px y 12 px al 100 %: al 200 %, el doble.
  expect(medidas.texto, 'el texto del aviso crece con la raíz').toBeGreaterThanOrEqual(25)
  expect(medidas.boton, 'el botón del aviso crece con la raíz').toBeGreaterThanOrEqual(22)
  expect(medidas.iconoDerecha, 'el icono no pisa el texto').toBeLessThanOrEqual(
    medidas.textoIzquierda + 1,
  )
  await capturar(page, info, 'aviso-texto-200')
})
