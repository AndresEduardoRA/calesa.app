// Lo que se afirma de la barra de un listado (`<FilterShell>`: búsqueda, «Filtros», «Vistas», las acciones y «Ítems por página») sin mirarla:
// que se lea en orden, desde la izquierda, y que ningún botón quede solo en una fila si cabía en la anterior (cierre 5b, defecto 4.1: al
// 200 % «Vistas» quedaba sola y los botones se repartían a la derecha, cada uno en su fila).
import { expect, type Locator, type Page } from '@playwright/test'

export type PiezaDeLaBarra = { nombre: string; lugar: Locator }

type Caja = { nombre: string; x: number; y: number; ancho: number; alto: number; fila: number }

// Dos cuadros: lo que cambió de tamaño o de lugar ya se acomodó (las cajas no se animan, pero el `rem` de la raíz se aplica al repintar).
export const esperarDosCuadros = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((listo) =>
        requestAnimationFrame(() => requestAnimationFrame(() => listo())),
      ),
  )

// Las cajas de las piezas con la fila de cada una: dos piezas están en la misma fila si sus alturas se solapan (la barra centra los
// elementos de una línea; entre líneas hay un hueco).
async function cajasDe(page: Page, piezas: PiezaDeLaBarra[]): Promise<Caja[]> {
  await esperarDosCuadros(page)
  const medidas = await Promise.all(
    piezas.map(async ({ nombre, lugar }) => {
      const caja = await lugar.boundingBox()
      expect(caja, `«${nombre}» está a la vista`).not.toBeNull()
      return {
        nombre,
        x: caja?.x ?? 0,
        y: caja?.y ?? 0,
        ancho: caja?.width ?? 0,
        alto: caja?.height ?? 0,
      }
    }),
  )
  const porAltura = [...medidas].sort((a, b) => a.y + a.alto / 2 - (b.y + b.alto / 2))
  const filas = new Map<string, number>()
  let fila = 0
  let hasta = Number.NEGATIVE_INFINITY
  for (const m of porAltura) {
    if (m.y >= hasta - 1) {
      fila = filas.size === 0 ? 0 : fila + 1
      hasta = m.y + m.alto
    } else {
      hasta = Math.max(hasta, m.y + m.alto)
    }
    filas.set(m.nombre, fila)
  }
  return medidas.map((m) => ({ ...m, fila: filas.get(m.nombre) ?? 0 }))
}

// Lo que tiene que cumplir la barra con las piezas en el orden del DOM: se leen en ese orden (de arriba abajo y de izquierda a derecha),
// cada fila nueva empieza en el borde izquierdo de la barra y la que empieza una fila no habría cabido al final de la anterior.
export async function exigirBarraOrdenada(
  page: Page,
  barra: Locator,
  piezas: PiezaDeLaBarra[],
): Promise<Caja[]> {
  const cajas = await cajasDe(page, piezas)
  const borde = await barra.boundingBox()
  expect(borde, 'la barra está a la vista').not.toBeNull()
  const izquierda = borde?.x ?? 0
  const derecha = izquierda + (borde?.width ?? 0)
  const detalle = cajas
    .map(
      (c) =>
        `${c.nombre} (fila ${String(c.fila)}, x ${String(Math.round(c.x))}, ancho ${String(Math.round(c.ancho))})`,
    )
    .join(' · ')

  const leidas = [...cajas].sort((a, b) => a.fila - b.fila || a.x - b.x).map((c) => c.nombre)
  expect(leidas, `se leen en el orden del DOM: ${detalle}`).toEqual(piezas.map((p) => p.nombre))

  const filas = [...new Set(cajas.map((c) => c.fila))].sort((a, b) => a - b)
  for (const fila of filas.slice(1)) {
    const deEsta = cajas.filter((c) => c.fila === fila).sort((a, b) => a.x - b.x)
    const primera = deEsta[0]
    const anterior = cajas.filter((c) => c.fila === fila - 1)
    const finDeLaAnterior = Math.max(...anterior.map((c) => c.x + c.ancho))
    if (primera) {
      expect(
        Math.abs(primera.x - izquierda),
        `«${primera.nombre}» empieza su fila en el borde izquierdo de la barra: ${detalle}`,
      ).toBeLessThanOrEqual(2)
      expect(
        finDeLaAnterior + primera.ancho,
        `«${primera.nombre}» no cabía al final de la fila anterior: ${detalle}`,
      ).toBeGreaterThan(derecha)
    }
  }
  return cajas
}

// El marcador de un campo de búsqueda cabe entero en el campo: se mide con el mismo tipo de letra (un `placeholder` largo se corta con
// «…» o sin nada, y quien lo lee no sabe qué se busca). Descuenta los rellenos, también el del icono si lo hay.
export async function exigirMarcadorQueCabe(campo: Locator): Promise<void> {
  const medida = await campo.evaluate((el) => {
    const entrada = el as HTMLInputElement
    const estilo = getComputedStyle(entrada)
    const contexto = document.createElement('canvas').getContext('2d')
    if (!contexto) {
      return null
    }
    contexto.font = `${estilo.fontStyle} ${estilo.fontWeight} ${estilo.fontSize} ${estilo.fontFamily}`
    return {
      texto: entrada.placeholder,
      ancho: contexto.measureText(entrada.placeholder).width,
      lugar:
        entrada.clientWidth -
        Number.parseFloat(estilo.paddingLeft) -
        Number.parseFloat(estilo.paddingRight),
    }
  })
  expect(medida, 'el navegador mide texto').not.toBeNull()
  expect(
    medida?.ancho ?? Infinity,
    `el marcador «${medida?.texto ?? ''}» (${String(Math.round(medida?.ancho ?? 0))} px) cabe en el campo (${String(Math.round(medida?.lugar ?? 0))} px)`,
  ).toBeLessThanOrEqual(medida?.lugar ?? 0)
}
