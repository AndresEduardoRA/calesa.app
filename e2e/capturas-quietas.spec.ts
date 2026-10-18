import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { capturarEn, esperarQueEsteQuieta } from './soporte/capturas'

// El ayudante de las capturas (`E2E_CAPTURAS`) espera a que la pantalla esté quieta (cierre 4): dos lecturas equivocadas de los botones
// fueron capturas tomadas a media transición. Sin la app: una página con una transición de 1,2 s que arranca un cuadro después de
// montarse (como la entrada de un aviso), y el color de un píxel de lo capturado, leído en el navegador. Una captura cruda en el mismo
// instante ve otra cosa: eso prueba que la prueba muerde.
const carpeta = mkdtempSync(join(tmpdir(), 'capturas-quietas-'))
test.afterAll(() => {
  rmSync(carpeta, { recursive: true, force: true })
})

const PAGINA = (extra = '') => `
  <body style="margin:0;background:#fff">
    <div id="caja" style="width:200px;height:100px;background:rgb(0,0,255);opacity:0"></div>
    ${extra}
    <script>
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const caja = document.getElementById('caja')
        caja.style.transition = 'opacity 1.2s linear'
        caja.style.opacity = '1'
      }))
    </script>
  </body>`

// El píxel (50, 50) de un PNG, leído con un canvas del navegador.
async function pixel(page: Page, ruta: string): Promise<{ rojo: number; azul: number }> {
  const base64 = readFileSync(ruta).toString('base64')
  return page.evaluate(async (datos) => {
    const imagen = new Image()
    imagen.src = `data:image/png;base64,${datos}`
    await imagen.decode()
    const lienzo = document.createElement('canvas')
    lienzo.width = imagen.width
    lienzo.height = imagen.height
    const contexto = lienzo.getContext('2d')
    contexto?.drawImage(imagen, 0, 0)
    const [rojo = -1, , azul = -1] = contexto?.getImageData(50, 50, 1, 1).data ?? []
    return { rojo, azul }
  }, base64)
}

test('una captura cruda ve la transición a medias; la del ayudante ve el estado final', async ({
  page,
}, info) => {
  await page.setContent(PAGINA())
  const cruda = join(carpeta, `cruda-${info.project.name}.png`)
  await page.screenshot({ path: cruda })
  // Blanco o a medias: todavía no es el azul de lo terminado (rojo 0).
  expect(
    (await pixel(page, cruda)).rojo,
    'la captura cruda ve el principio de la transición',
  ).toBeGreaterThan(40)

  await page.setContent(PAGINA())
  const quieta = join(carpeta, `quieta-${info.project.name}.png`)
  const espera = await capturarEn(page, quieta)
  expect(espera.quieta).toBe(true)
  const final = await pixel(page, quieta)
  expect(final.rojo).toBeLessThan(10)
  expect(final.azul).toBeGreaterThan(245)
})

test('con una animación infinita a la vista no se cuelga: espera lo que tiene fin y deja el resto congelado', async ({
  page,
}, info) => {
  const giratoria = `<div style="width:20px;height:20px;background:#000;animation:giro 1s linear infinite;position:absolute;left:300px"></div>
    <style>@keyframes giro { to { transform: rotate(360deg) } }</style>`
  await page.setContent(PAGINA(giratoria))
  const ruta = join(carpeta, `infinita-${info.project.name}.png`)
  const inicio = Date.now()
  const espera = await capturarEn(page, ruta)
  expect(Date.now() - inicio, 'tarda lo de la transición, no el tope').toBeLessThan(1900)
  expect(espera.quieta).toBe(true)
  expect((await pixel(page, ruta)).rojo).toBeLessThan(10)
})

test('si lo que anima no termina dentro del tope, lo dice y no se cuelga', async ({ page }) => {
  await page.setContent(`<div id="lenta" style="width:50px;height:50px;opacity:0"></div>
    <script>requestAnimationFrame(() => { const e = document.getElementById('lenta'); e.style.transition = 'opacity 5s'; e.style.opacity = '1' })</script>`)
  const inicio = Date.now()
  const espera = await esperarQueEsteQuieta(page, 400)
  expect(Date.now() - inicio).toBeLessThan(1500)
  expect(espera.quieta).toBe(false)
  expect(espera.pendientes).toEqual(['transición de opacity'])
})
