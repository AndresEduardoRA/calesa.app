// Esperar el estado final antes de medir (`recorrido.ts` las reexporta: los specs las importan de allí). Medir una caja o preguntar quién
// recibe el clic una sola vez, apenas aparece un aviso o termina una acción, depende de la velocidad de la máquina: en un runner lento
// (CI-2) el pie de un panel seguía en «Guardando…». Se espera el estado, nunca un tiempo.
import { expect, type Locator, type Page, type Request, type Response } from '@playwright/test'

// Un panel que entra con animación (zoom, deslizamiento) mide menos mientras entra: se espera a que
// termine antes de medir cajas.
export async function quieto(lugar: Locator): Promise<void> {
  await lugar.evaluate(async (e) => {
    // Lo que empieza en el cuadro siguiente a montarse (la entrada de un aviso) todavía no figura en `getAnimations()`: dos cuadros antes.
    const cuadro = () => new Promise<void>((seguir) => requestAnimationFrame(() => seguir()))
    await cuadro()
    await cuadro()
    await Promise.all(
      e.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)),
    )
  })
}

// El pie de un panel, quieto: ni «Guardando…» ni un botón deshabilitado. La acción de guardar avisa («Lead creado») cuando responde, pero
// su `isPending` sigue prendido hasta que la pantalla termina de refrescarse: el aviso ya se ve y el pie todavía no (40 ms en una PC
// rápida, casi un segundo con la CPU 20 veces más lenta; `docs/PLAN.md`, 9-7). Un botón `disabled` lleva `pointer-events: none`: el clic
// lo atraviesa y lo recibe el pie, así que medirlo antes dice «tapado» cuando sólo está ocupado.
export async function pieQuieto(pie: Locator): Promise<void> {
  await expect(pie.getByText('Guardando…')).toHaveCount(0)
  const botones = pie.getByRole('button')
  const cuantos = await botones.count()
  for (let i = 0; i < cuantos; i++) {
    await expect(botones.nth(i)).toBeEnabled()
  }
}

// El elemento que recibe un clic en el centro de la caja es éste (o está adentro): nada lo tapa. Se mide con la caja quieta: se espera a
// que dos cuadros seguidos den el mismo rectángulo (con tope de 2 s) y el clic se calcula en ese mismo cuadro; un botón que todavía se
// desliza (un aviso que entra, una pestaña que se acomoda) tiene el centro en otro lugar.
export async function recibeElClic(lugar: Locator): Promise<void> {
  await expect(lugar).toBeVisible()
  const lo = await lugar.evaluate(async (elemento) => {
    const cuadro = () => new Promise<void>((seguir) => requestAnimationFrame(() => seguir()))
    const ancestros = (e: Element): Element[] =>
      e.parentElement ? [e.parentElement, ...ancestros(e.parentElement)] : []
    const medir = () => {
      const caja = elemento.getBoundingClientRect()
      return [caja.left, caja.top, caja.width, caja.height]
    }
    const igual = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - (b[i] ?? 0)) < 0.5)
    const limite = performance.now() + 2000
    // Una transición recién iniciada mide lo mismo en sus primeros cuadros (en un runner cargado, el reloj de la animación aún no
    // avanzó): se espera a que terminen las del elemento y sus ancestros, y luego a tres cuadros iguales.
    const terminan = () =>
      Promise.all(
        [elemento, ...ancestros(elemento)].flatMap((e) =>
          e.getAnimations().map((a) => a.finished.catch(() => undefined)),
        ),
      )
    await cuadro()
    await Promise.race([terminan(), new Promise((seguir) => setTimeout(seguir, 2000))])
    let iguales = 0
    let ahora = medir()
    while (iguales < 2 && performance.now() < limite) {
      const antes = ahora
      await cuadro()
      ahora = medir()
      iguales = igual(antes, ahora) ? iguales + 1 : 0
    }
    const quieta = iguales >= 2
    const [izquierda = 0, arriba = 0, ancho = 0, alto = 0] = ahora
    const encima = document.elementFromPoint(izquierda + ancho / 2, arriba + alto / 2)
    const describir = (e: Element | null) =>
      e
        ? `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''} «${e.textContent.trim().slice(0, 40)}»`
        : 'nada'
    return {
      quieta,
      recibe: encima !== null && elemento.contains(encima),
      quien: describir(encima),
    }
  })
  expect(lo.quieta, 'la caja del elemento no se aquietó en 2 s').toBe(true)
  expect(lo.recibe, `el clic lo recibe ${lo.quien}`).toBe(true)
}

// --- Los pedidos -------------------------------------------------------------------------------------
// Leer un texto o contar filas tras un clic que dispara un pedido es esperar un tiempo: los 5 s de fábrica de un `expect` no alcanzan si
// el pedido se demora (la CPU lenta, la base cargada) y sobran si no. Se espera la respuesta, con un tope propio que dice qué faltó.

export const esRpc = (nombre: string) => (r: Response) =>
  r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith(`/rpc/${nombre}`)

export const esRuta = (ruta: string) => (r: Response) =>
  r.request().method() === 'POST' && new URL(r.url()).pathname === ruta

export const esAccionDelServidor = (r: Response) =>
  r.request().method() === 'POST' && r.request().headers()['next-action'] !== undefined

// Arma la espera ANTES de la acción (sin carrera con la respuesta), la deja correr y devuelve la respuesta. Si vence el tope el error dice
// qué pedido faltó y cuánto se esperó, no «el test superó los 30 s». Anota lo que tardó. `espera` es la etiqueta (tope de 30 s) o
// `{ etiqueta, tope }`. No lee el cuerpo ni las cabeceras.
export async function conRespuesta(
  page: Page,
  coincide: (r: Response) => boolean,
  accion: () => Promise<unknown>,
  espera: string | { etiqueta: string; tope: number },
): Promise<Response> {
  const { etiqueta, tope } =
    typeof espera === 'string' ? { etiqueta: espera, tope: 30_000 } : espera
  const inicio = performance.now()
  const llega = page.waitForResponse(coincide, { timeout: tope })
  // Si la acción falla, la espera armada no debe quedar colgada sin que nadie la atienda.
  llega.catch(() => undefined)
  await accion()
  try {
    const r = await llega
    console.warn(`[espera] ${etiqueta}: ${Math.round(performance.now() - inicio)} ms`)
    return r
  } catch {
    throw new Error(`«${etiqueta}»: no llegó la respuesta en ${tope} ms`)
  }
}

// Cada pedido que coincide tarda `ms` más en salir; la respuesta es la real. Devuelve los pedidos demorados.
export async function demorarPedido(
  page: Page,
  coincide: (pedido: Request) => boolean,
  ms: number,
): Promise<Request[]> {
  const demorados: Request[] = []
  await page.route('**/*', async (ruta) => {
    if (coincide(ruta.request())) {
      demorados.push(ruta.request())
      await new Promise((listo) => setTimeout(listo, ms))
    }
    await ruta.fallback()
  })
  return demorados
}
