// El ayudante de las capturas que la IA mira (`E2E_CAPTURAS`): una captura se toma con la pantalla QUIETA. Dos lecturas equivocadas de
// los botones (cierres 1 y 2) fueron capturas tomadas a media transición (un botón a 15 px y a 13 px cuando su tamaño final era 26),
// y un aviso translúcido cazado mientras entraba no sirvió de evidencia de su tipografía. Esperar es lo primero; `animations: 'disabled'`
// es el respaldo (lleva las animaciones finitas a su fin y congela las infinitas, como el spinner de un aviso o el pulso de un esqueleto,
// que nunca terminan: esperarlas colgaría la captura).
import type { Page } from '@playwright/test'

const TOPE_DE_ESPERA_EN_MS = 2000

export type EsperaDeCaptura = {
  // Todo lo que tenía fin terminó dentro del tope.
  quieta: boolean
  // Las animaciones o transiciones que seguían en curso al llegar al tope (para decirlo).
  pendientes: string[]
}

// Espera a que no quede ninguna animación ni transición con fin: dos cuadros (lo que empieza en el cuadro siguiente a montarse, como
// la entrada de un aviso, todavía no existe en `getAnimations()`), después lo que haya, y otra vez, porque una puede arrancar otra
// (un panel que entra y deja crecer un aviso). Las infinitas no se esperan. Con tope: nunca cuelga la captura.
export async function esperarQueEsteQuieta(
  page: Page,
  topeEnMs = TOPE_DE_ESPERA_EN_MS,
): Promise<EsperaDeCaptura> {
  return page.evaluate(async (tope) => {
    const cuadro = () => new Promise<void>((seguir) => requestAnimationFrame(() => seguir()))
    const conFin = () =>
      document.getAnimations().filter((a) => {
        const iteraciones = a.effect?.getComputedTiming().iterations
        return iteraciones !== Number.POSITIVE_INFINITY && a.playState !== 'finished'
      })
    const nombre = (a: Animation) =>
      a instanceof CSSTransition
        ? `transición de ${a.transitionProperty}`
        : a instanceof CSSAnimation
          ? `animación ${a.animationName}`
          : 'animación'
    const limite = performance.now() + tope
    await cuadro()
    await cuadro()
    let enCurso = conFin()
    while (enCurso.length > 0 && performance.now() < limite) {
      await Promise.race([
        Promise.allSettled(enCurso.map((a) => a.finished)),
        new Promise<void>((seguir) => setTimeout(seguir, Math.max(0, limite - performance.now()))),
      ])
      await cuadro()
      enCurso = conFin()
    }
    return { quieta: enCurso.length === 0, pendientes: enCurso.map(nombre) }
  }, topeEnMs)
}

// La captura, con la pantalla quieta. Si el tope se alcanza lo dice en voz alta (la captura sale igual, con lo que quedaba en curso
// llevado a su fin).
export async function capturarEn(page: Page, ruta: string): Promise<EsperaDeCaptura> {
  const espera = await esperarQueEsteQuieta(page)
  if (!espera.quieta) {
    console.warn(
      `[capturas] ${ruta}: algo seguía animándose tras ${String(TOPE_DE_ESPERA_EN_MS)} ms (${espera.pendientes.join(', ')}): la captura lo muestra en su estado final.`,
    )
  }
  await page.screenshot({ path: ruta, animations: 'disabled', caret: 'hide' })
  return espera
}
