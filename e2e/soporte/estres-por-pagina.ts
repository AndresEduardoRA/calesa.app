// El estrés de «Ítems por página» con una navegación pendiente (5a-15): elegir el tamaño mientras la página 3 todavía se está pidiendo
// o dibujando tiene que terminar SIEMPRE en la primera página con ese tamaño, la URL con `?por=` y la cuenta con lo guardado. No corre
// en cada corrida (20 veces por modo y por lista son minutos): sólo con `E2E_ESTRES=1`, una vez al cerrar una tarea que toque
// `shared/ui/filtros` o la preferencia (`playwright.config.ts`, como el volumen).
import { expect, type Page } from '@playwright/test'
import { filasDelListado, parametrosDe, registrarRed, selectorDeTamano } from './listas-por-pagina'
import { demorarAcciones } from './recorrido'

export const CORRIDAS_DE_ESTRES = 20
const LATENCIA_MS = 1_000
// El guardado tarda más que cualquier lectura: si la navegación a `?por=` saliera antes de que termine, la respuesta tardía de la acción
// (con la página de la URL de antes) llegaría después y la pisaría.
const LATENCIA_DEL_GUARDADO_MS = 3_000
const ESCALA_DE_CPU = 6

export type ModoDeEstres = 'latencia' | 'cpu'

const dormir = (ms: number) => new Promise((listo) => setTimeout(listo, ms))

// `ms` más en cada lectura de la pantalla (RSC, también las de adelanto).
async function conLatenciaEnLecturas(page: Page, ms: number): Promise<void> {
  await page.route('**/*', async (ruta) => {
    const pedido = ruta.request()
    if (pedido.method() === 'GET' && pedido.headers()['rsc'] !== undefined) {
      await dormir(ms)
    }
    await ruta.fallback()
  })
}

async function conCpuLenta(page: Page, escala: number): Promise<void> {
  const sesion = await page.context().newCDPSession(page)
  await sesion.send('Emulation.setCPUThrottlingRate', { rate: escala })
}

export type Escenario = {
  modo: ModoDeEstres
  // El tamaño al que se cambia (distinto del de partida, 10).
  tamano: number
  // Deja la preferencia en 10 y abre el listado en su primera página.
  abrirEnLaPrimera: () => Promise<void>
  preferenciaGuardada: () => Promise<number | null>
}

// Repite `CORRIDAS_DE_ESTRES` veces: segunda «Siguiente» y, sin esperar a su fila (en `latencia`: con la lectura en camino; en `cpu`: apenas
// llega la respuesta, que es cuando React todavía no dibujó la página 3 —la forma de la traza del 2026-10-19—), elegir el tamaño.
export async function repetirEleccionPendiente(page: Page, escenario: Escenario): Promise<void> {
  const { modo, tamano } = escenario
  if (modo === 'latencia') {
    await conLatenciaEnLecturas(page, LATENCIA_MS)
    // Y el guardado de la preferencia también tarda: es el orden «guardar y después navegar» lo que se prueba (si la navegación saliera
    // antes, la respuesta de la acción traería la página de la URL de antes y la pisaría).
    await demorarAcciones(page, LATENCIA_DEL_GUARDADO_MS)
  } else {
    await conCpuLenta(page, ESCALA_DE_CPU)
  }
  const margen = modo === 'latencia' ? LATENCIA_DEL_GUARDADO_MS + LATENCIA_MS * 4 + 6_000 : 15_000
  const lecturaDeCursor = (r: {
    url: () => string
    request: () => { headers: () => Record<string, string> }
  }) =>
    /cursor=/.test(r.url()) &&
    r.request().headers()['rsc'] !== undefined &&
    r.request().headers()['next-router-prefetch'] === undefined
  for (let corrida = 1; corrida <= CORRIDAS_DE_ESTRES; corrida++) {
    const red = registrarRed(page)
    await escenario.abrirEnLaPrimera()
    await expect(filasDelListado(page)).toHaveCount(10)
    await expect(selectorDeTamano(page)).toHaveAttribute('data-hidratado', 'true')
    for (let n = 0; n < 2; n++) {
      const respuesta = page.waitForResponse(lecturaDeCursor)
      await page.getByRole('link', { name: 'Siguiente' }).click()
      if (n === 0) {
        await expect(page).toHaveURL(/cursor=/)
        await expect(filasDelListado(page)).toHaveCount(10)
      } else if (modo === 'cpu') {
        await respuesta
      }
    }
    await selectorDeTamano(page).selectOption(String(tamano))
    if (modo === 'latencia') {
      // El guardado sigue en vuelo (tarda 3 s): la navegación a `?por=` espera a que termine, no sale a la vez.
      expect(parametrosDe(page).has('por')).toBe(false)
    }
    try {
      await expect(filasDelListado(page)).toHaveCount(tamano, { timeout: margen })
      await expect
        .poll(() => parametrosDe(page).get('por'), { timeout: margen })
        .toBe(String(tamano))
      expect(parametrosDe(page).has('cursor')).toBe(false)
      await expect(selectorDeTamano(page)).toHaveValue(String(tamano))
      await expect.poll(escenario.preferenciaGuardada, { timeout: margen }).toBe(tamano)
    } catch (error) {
      // Cuándo salió cada pedido: con eso se ve si la acción y la navegación se cruzaron.
      const linea: string[] = []
      await red.adjuntar({ attach: (_nombre, { body }) => Promise.resolve(void linea.push(body)) })
      throw new Error(
        `corrida ${String(corrida)} de ${String(CORRIDAS_DE_ESTRES)} (${modo}): ${String(error)}\n${linea.join('')}`,
      )
    }
  }
}
