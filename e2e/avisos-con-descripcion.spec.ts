import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { irAlEmbudo } from './soporte/leads-oportunidades'
import {
  avisoNoTapaElPie,
  capturar,
  limpiarRecorrido,
  prepararRecorrido,
  type TerrenoDelRecorrido,
} from './soporte/recorrido'
import { contraste } from '../src/shared/lib/color'

// Un aviso con descripción (cierre 4, pendiente 3): el único que hoy la lleva es el de la sesión vencida («Tu sesión venció»,
// «Lo que escribiste sigue acá…», con «Ingresar»). Sonner le fija el ancho, mide su alto una sola vez y pinta la descripción con un
// gris propio; con el texto al 200 % tiene que crecer con él (título, descripción y botón), no cortar nada, no salirse de la pantalla,
// no tapar el pie del panel y leerse (contraste AA) en claro y en oscuro.
test.describe.configure({ mode: 'serial' })

let r: TerrenoDelRecorrido

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'AvisoDescripcion')
})

test.afterAll(async () => {
  await limpiarRecorrido(r)
})

const alDoscientos = (page: Page) =>
  page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })

const haceHex = (rgb: string): string => {
  const [rojo = 0, verde = 0, azul = 0] = (rgb.match(/[\d.]+/g) ?? []).map(Number)
  return `#${[rojo, verde, azul].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

// Con el panel de «Etapas» abierto y un cambio hecho, se pierde la sesión (otra pestaña la cerró) y se guarda: el aviso de «sesión
// vencida» sale con su descripción, encima del pie del panel, sin cerrarlo ni perder lo hecho.
async function sesionVencida(page: Page) {
  await page.getByRole('button', { name: 'Etapas', exact: true }).click()
  const panel = page.getByRole('dialog', { name: /Etapas de/ })
  await expect(panel).toBeVisible()
  await panel.getByRole('button', { name: 'Bajar Nuevo' }).click()
  await page.context().clearCookies()
  await panel.getByRole('button', { name: 'Guardar' }).click()
  const aviso = page
    .locator('[data-sonner-toast]')
    .filter({ hasText: 'Lo que escribiste sigue acá' })
  await expect(aviso).toBeVisible()
  return { panel, aviso }
}

type Medidas = {
  titulo: number
  descripcion: number
  boton: number
  sobra: number
  ancho: number
  derecha: number
  pantalla: number
  colorDescripcion: string
  fondo: string
  descripcionAbajo: number
  avisoAbajo: number
}

// Lo que se ve del aviso, en reposo.
const medir = (aviso: Locator): Promise<Medidas> =>
  aviso.evaluate((el) => {
    const px = (e: Element | null) => (e ? Number.parseFloat(getComputedStyle(e).fontSize) : 0)
    const titulo = el.querySelector('[data-title]')
    const descripcion = el.querySelector('[data-description]')
    const caja = el.getBoundingClientRect()
    return {
      titulo: px(titulo),
      descripcion: px(descripcion),
      boton: px(el.querySelector('[data-button]')),
      // Cuánto contenido no cabe en la caja (0 = nada cortado).
      sobra: Math.max(0, el.scrollHeight - el.clientHeight),
      ancho: caja.width,
      derecha: caja.right,
      pantalla: document.documentElement.clientWidth,
      colorDescripcion: descripcion ? getComputedStyle(descripcion).color : '',
      fondo: getComputedStyle(el).backgroundColor,
      descripcionAbajo: descripcion?.getBoundingClientRect().bottom ?? 0,
      avisoAbajo: caja.bottom,
    }
  })

for (const tema of ['light', 'dark'] as const) {
  for (const texto of ['100 %', '200 %'] as const) {
    test(`el aviso con descripción al ${texto}, en ${tema === 'light' ? 'claro' : 'oscuro'}: crece con el texto, no corta nada y se lee`, async ({
      page,
    }, info) => {
      await page.emulateMedia({ colorScheme: tema })
      await entrar(page, r.ana.email)
      await irAlEmbudo(page)
      if (texto === '200 %') {
        await alDoscientos(page)
      }
      const { panel, aviso } = await sesionVencida(page)
      // Entra deslizándose y translúcido: se mide y se mira en reposo.
      await avisoNoTapaElPie(aviso, panel.locator('[data-slot="sheet-footer"]'))
      await expect
        .poll(async () => (await medir(aviso)).sobra, { message: 'el aviso corta su contenido' })
        .toBe(0)
      const m = await medir(aviso)
      const factor = texto === '200 %' ? 2 : 1
      // 13 px el título y la descripción, 12 el botón, al 100 %.
      expect(m.titulo, 'el título sigue a la raíz').toBeGreaterThanOrEqual(13 * factor - 0.5)
      expect(m.descripcion, 'la descripción sigue a la raíz').toBeGreaterThanOrEqual(
        13 * factor - 0.5,
      )
      expect(m.boton, 'el botón sigue a la raíz').toBeGreaterThanOrEqual(12 * factor - 0.5)
      expect(m.descripcionAbajo, 'la descripción cabe en la caja').toBeLessThanOrEqual(
        m.avisoAbajo + 1,
      )
      expect(m.derecha, 'el aviso no se sale de la pantalla').toBeLessThanOrEqual(m.pantalla + 1)
      // El ancho crece con el texto. En el celular, 356 px al 100 % (sin pasar de la pantalla menos 1 rem por lado); en escritorio los avisos salen abajo a la
      // izquierda, sobre la barra lateral, y llenan su carril (13,5 rem: 216 px al 100 %, 432 al 200 %): así no tapan el contenido (4-15).
      const esperado =
        info.project.name === 'escritorio'
          ? 13.5 * 16 * factor
          : Math.min(356 * factor, m.pantalla - 2 * 16 * factor)
      expect(m.ancho, 'el aviso llena su carril y crece con el texto').toBeGreaterThanOrEqual(
        esperado - 1,
      )
      if (info.project.name === 'escritorio') {
        expect(m.ancho, 'el aviso no es más ancho que su carril').toBeLessThanOrEqual(esperado + 1)
      }
      expect(
        contraste(haceHex(m.colorDescripcion), haceHex(m.fondo)),
        'la descripción se lee (AA)',
      ).toBeGreaterThanOrEqual(4.5)
      await capturar(page, info, `aviso-descripcion-${tema}-${factor === 2 ? '200' : '100'}`)
    })
  }
}
