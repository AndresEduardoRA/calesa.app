import { expect, test } from './soporte/prueba'
import {
  aLaVistaAlAcomodarse,
  aLaVistaSinDesplazar,
  avisoNoTapaElPie,
  recibeElClic,
} from './soporte/recorrido'

// Las esperas de `e2e/soporte/recorrido.ts`, en una página armada aquí y no en la app: un runner lento mostró (CI-2) que `recibeElClic`
// medía una sola vez. Un botón `disabled` lleva `pointer-events: none` (como el de shadcn): el punto lo atraviesa y «lo recibe» el pie.
// El pie de un panel sigue en «Guardando…», con los botones deshabilitados, un rato después de que el aviso de «guardado» ya está
// visible (`isPending` de la acción espera al refresco de la pantalla). Medir ahí es medir un estado que no es el final.

const ESTILO = `
  body { margin: 0; font: 14px sans-serif; }
  button:disabled { pointer-events: none; opacity: .5; }
  #aviso { position: fixed; left: 20px; top: 20px; width: 200px; height: 60px; background: #ddd; pointer-events: none; }
  #pie { position: fixed; left: 20px; bottom: 20px; width: 360px; height: 60px; display: flex; gap: 8px; }
`

test('el aviso sobre el pie se mide con el pie quieto, no mientras guarda', async ({ page }) => {
  await page.setContent(`<style>${ESTILO}</style>
    <div id="aviso">Lead creado</div>
    <div id="pie">
      <button id="cancelar" disabled>Cancelar</button>
      <button id="guardar" disabled>Guardando…</button>
    </div>
    <script>
      // El pie vuelve a la vida 700 ms después de que todo lo demás ya está dibujado.
      setTimeout(() => {
        for (const b of document.querySelectorAll('#pie button')) b.disabled = false
        document.querySelector('#guardar').textContent = 'Guardar lead'
      }, 700)
    </script>`)
  await avisoNoTapaElPie(page.locator('#aviso'), page.locator('#pie'))
  // Si midió, midió con el pie ya quieto.
  await expect(page.locator('#guardar')).toBeEnabled({ timeout: 0 })
  await expect(page.locator('#guardar')).toHaveText('Guardar lead', { timeout: 0 })
})

test('recibeElClic mide con la caja del botón quieta, no a mitad de una transición', async ({
  page,
}) => {
  // El botón arranca debajo de una tapa y se desliza 600 ms hacia un lugar libre: al empezar su centro está tapado, al final no.
  await page.setContent(`<style>
      body { margin: 0; }
      #boton { position: absolute; top: 100px; left: 0; width: 100px; height: 40px; transition: left 600ms linear; }
      #boton.va { left: 400px; }
      #tapa { position: absolute; top: 0; left: 0; width: 250px; height: 300px; background: #ccc; z-index: 2; }
    </style>
    <button id="boton">Seguir</button><div id="tapa"></div>`)
  await page.evaluate(() => document.querySelector('#boton')?.classList.add('va'))
  await recibeElClic(page.locator('#boton'))
})

// CI-3: la pestaña abierta de una barra con desborde ya viene marcada y se ve, pero la barra se desplaza hasta ella recién al hidratar
// (`PestanasConDesborde`). Aquí la barra se desplaza 600 ms después de cargar: medir apenas se ve cae, esperar el estado no.
const BARRA_QUE_SE_ACOMODA = `<style>
    body { margin: 0; font: 16px sans-serif; }
    #barra { width: 220px; overflow-x: auto; white-space: nowrap; display: flex; }
    [role=tab] { flex: none; width: 120px; }
  </style>
  <div id="barra" role="tablist">
    <button role="tab" aria-selected="false">Campos</button>
    <button role="tab" aria-selected="false">Orígenes</button>
    <button role="tab" aria-selected="false">Tipos</button>
    <button role="tab" aria-selected="true">Seguimientos</button>
  </div>
  <script>
    setTimeout(() => {
      const barra = document.querySelector('#barra')
      barra.scrollLeft = barra.scrollWidth
    }, 600)
  </script>`

test('la pestaña abierta medida apenas se ve, antes de que la barra se acomode, no está a la vista', async ({
  page,
}) => {
  await page.setContent(BARRA_QUE_SE_ACOMODA)
  const abierta = page.getByRole('tab', { selected: true })
  await expect(abierta).toBeVisible()
  await expect(aLaVistaSinDesplazar(abierta, 'la pestaña abierta')).rejects.toThrow(
    /lo recorta un contenedor que se desplaza/,
  )
})

test('aLaVistaAlAcomodarse espera a que la barra lleve la pestaña abierta a la vista', async ({
  page,
}) => {
  await page.setContent(BARRA_QUE_SE_ACOMODA)
  const barra = page.locator('#barra')
  // Al empezar la barra todavía no se movió: la espera hace falta.
  expect(await barra.evaluate((b) => b.scrollLeft)).toBe(0)
  await aLaVistaAlAcomodarse(page.getByRole('tab', { selected: true }), 'la pestaña abierta')
  // Si midió, midió con la barra ya desplazada.
  expect(await barra.evaluate((b) => b.scrollLeft)).toBeGreaterThan(0)
})
