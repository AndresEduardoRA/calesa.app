import { expect, test, type Page } from './soporte/prueba'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { ingresar } from './soporte/pasos'

// 5a-20: el interruptor (`<Switch>`) con el texto al 200 %. La pista y el pulgar se medían en unidades distintas (la pista en px, el
// pulgar en rem): al 200 % el pulgar medía 32 px, desbordaba la pista de 32 × 18,4 y se veía partido. Ahora van en rem. Al 200 % el
// pulgar cabe dentro de la pista, marcado y sin marcar, en el tamaño normal y en el `sm`; al 100 % la pista mide lo de siempre y se dibuja
// igual, píxel a píxel, que con la geometría de antes.

const CLAVE = 'una-clave-de-prueba-9'

let duena = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-interruptor-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Interruptor' })
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
})

// Pantallas con interruptores de los dos tamaños: la matriz (normal), Empresa (normal, con su texto) y los campos de leads (`sm`).
const PANTALLAS = [
  '/configuracion/roles',
  '/configuracion/empresa?seccion=empresa',
  '/configuracion/empresa?seccion=integraciones',
  '/configuracion/leads?seccion=campos',
]

async function entrar(page: Page) {
  await page.goto('/ingreso')
  await ingresar(page, duena, CLAVE)
  await expect(page).toHaveURL('/')
}

const ponerElTexto = (page: Page, tamano: '' | '200%') =>
  page.evaluate(async (t) => {
    document.documentElement.style.fontSize = t
    // El tamaño cambia sin animar (rem); se espera igual a que no quede ninguna animación en marcha.
    await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)))
  }, tamano)

type Medida = {
  tamano: string
  marcado: boolean
  pista: { l: number; t: number; r: number; b: number; ancho: number; alto: number }
  pulgar: { l: number; t: number; r: number; b: number }
}

// Hasta tres interruptores visibles de cada tamaño y estado de la pantalla, con la caja de su pista y de su pulgar.
async function medir(page: Page): Promise<Medida[]> {
  return page.evaluate(() => {
    const cuenta = new Map<string, number>()
    const salida: Medida[] = []
    for (const pista of document.querySelectorAll<HTMLElement>('[data-slot=switch]')) {
      const pulgar = pista.querySelector('[data-slot=switch-thumb]')
      const c = pista.getBoundingClientRect()
      if (!pulgar || c.width === 0) continue
      const tamano = pista.getAttribute('data-size') ?? ''
      const marcado = pista.getAttribute('aria-checked') === 'true'
      const clave = `${tamano}-${String(marcado)}`
      if ((cuenta.get(clave) ?? 0) >= 3) continue
      cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1)
      const p = pulgar.getBoundingClientRect()
      salida.push({
        tamano,
        marcado,
        pista: { l: c.left, t: c.top, r: c.right, b: c.bottom, ancho: c.width, alto: c.height },
        pulgar: { l: p.left, t: p.top, r: p.right, b: p.bottom },
      })
    }
    return salida
  })
}

async function recorrer(page: Page, tamano: '' | '200%'): Promise<Medida[]> {
  const todas: Medida[] = []
  for (const url of PANTALLAS) {
    await page.goto(url)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await ponerElTexto(page, tamano)
    todas.push(...(await medir(page)))
  }
  return todas
}

const CASOS = [
  ['default', true],
  ['default', false],
  ['sm', true],
  ['sm', false],
] as const

test('al 200 %: el pulgar cabe dentro de la pista, marcado y sin marcar, en los dos tamaños', async ({
  page,
}) => {
  await entrar(page)
  const medidas = await recorrer(page, '200%')
  for (const [tamano, marcado] of CASOS) {
    expect(
      medidas.filter((m) => m.tamano === tamano && m.marcado === marcado).length,
      `ningún interruptor ${tamano} ${marcado ? 'marcado' : 'sin marcar'} en las pantallas`,
    ).toBeGreaterThan(0)
  }
  for (const m of medidas) {
    const que = `interruptor ${m.tamano} ${m.marcado ? 'marcado' : 'sin marcar'} (pista ${String(Math.round(m.pista.ancho * 10) / 10)} × ${String(Math.round(m.pista.alto * 10) / 10)})`
    expect(m.pulgar.l, `${que}: el pulgar se sale por la izquierda`).toBeGreaterThanOrEqual(
      m.pista.l - 0.5,
    )
    expect(m.pulgar.r, `${que}: el pulgar se sale por la derecha`).toBeLessThanOrEqual(
      m.pista.r + 0.5,
    )
    expect(m.pulgar.t, `${que}: el pulgar se sale por arriba`).toBeGreaterThanOrEqual(
      m.pista.t - 0.5,
    )
    expect(m.pulgar.b, `${que}: el pulgar se sale por abajo`).toBeLessThanOrEqual(m.pista.b + 0.5)
  }
  // La pista crece con el texto, como el botón: 32 × 18,4 px al 100 % son 64 × 36,8 al 200 %.
  const normal = medidas.find((m) => m.tamano === 'default')
  expect(normal?.pista.ancho).toBeCloseTo(64, 0)
  expect(normal?.pista.alto).toBeCloseTo(36.8, 0)
})

test('al 100 %: la pista mide lo de siempre, 32 × 18,4 px y 24 × 14 px', async ({ page }) => {
  await entrar(page)
  const medidas = await recorrer(page, '')
  const de = (tamano: string) => medidas.filter((m) => m.tamano === tamano)
  expect(de('default').length).toBeGreaterThan(0)
  expect(de('sm').length).toBeGreaterThan(0)
  for (const m of de('default')) {
    expect(m.pista.ancho).toBeCloseTo(32, 1)
    expect(m.pista.alto).toBeCloseTo(18.4, 1)
  }
  for (const m of de('sm')) {
    expect(m.pista.ancho).toBeCloseTo(24, 1)
    expect(m.pista.alto).toBeCloseTo(14, 1)
  }
})

// Cuántos píxeles distintos hay entre dos capturas y cuánto (el mayor salto de un canal, 0 a 255): como `mas-acciones-icono.spec.ts`.
async function comparar(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(
    async ([x, y]) => {
      type Imagen = { ancho: number; alto: number; datos: Uint8ClampedArray }
      const leer = async (base64: string): Promise<Imagen> => {
        const imagen = new Image()
        imagen.src = `data:image/png;base64,${base64}`
        await imagen.decode()
        const lienzo = document.createElement('canvas')
        lienzo.width = imagen.width
        lienzo.height = imagen.height
        const contexto = lienzo.getContext('2d')
        contexto?.drawImage(imagen, 0, 0)
        const datos = contexto?.getImageData(0, 0, imagen.width, imagen.height).data
        return { ancho: imagen.width, alto: imagen.height, datos: datos ?? new Uint8ClampedArray() }
      }
      const [pa, pb] = await Promise.all([leer(x), leer(y)])
      let distintos = 0
      let mayorSalto = 0
      for (let i = 0; i < pa.datos.length; i += 4) {
        const salto = Math.max(
          Math.abs((pa.datos[i] ?? 0) - (pb.datos[i] ?? 0)),
          Math.abs((pa.datos[i + 1] ?? 0) - (pb.datos[i + 1] ?? 0)),
          Math.abs((pa.datos[i + 2] ?? 0) - (pb.datos[i + 2] ?? 0)),
        )
        distintos += salto === 0 ? 0 : 1
        mayorSalto = Math.max(mayorSalto, salto)
      }
      return {
        mismoTamano: pa.ancho === pb.ancho && pa.alto === pb.alto,
        distintos,
        mayorSalto,
      }
    },
    [a.toString('base64'), b.toString('base64')] as const,
  )
}

// Cada interruptor se copia dos veces en un rincón, en posiciones enteras: una copia tal cual y otra con la geometría de antes escrita
// en línea (pista de 32 × 18,4 px y pulgar de 16 px, en px y no en rem).
test('al 100 %: se dibuja igual, píxel a píxel, que con la pista y el pulgar en px', async ({
  page,
}) => {
  await entrar(page)
  for (const marcado of [true, false]) {
    await page.goto('/configuracion/empresa?seccion=integraciones')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const estado = marcado ? 'true' : 'false'
    const dePrueba = page.locator(`[data-slot=switch][data-size=default][aria-checked=${estado}]`)
    // Una pantalla sin interruptor en ese estado se salta; el otro lo cubre, y que existan ambos lo afirma la prueba de arriba.
    if ((await dePrueba.count()) === 0) continue
    await dePrueba.first().evaluate((original) => {
      const copiar = (id: string, conPx: boolean) => {
        const copia = original.cloneNode(true) as HTMLElement
        copia.id = id
        copia.removeAttribute('aria-labelledby')
        copia.removeAttribute('aria-describedby')
        if (conPx) {
          copia.style.width = '32px'
          copia.style.height = '18.4px'
          const pulgar = copia.querySelector<HTMLElement>('[data-slot=switch-thumb]')
          if (pulgar) {
            pulgar.style.width = '16px'
            pulgar.style.height = '16px'
          }
        }
        return copia
      }
      const caja = document.createElement('div')
      caja.id = 'caja-de-las-copias'
      caja.style.cssText =
        'position:fixed;inset:0;z-index:9999;pointer-events:none;background:var(--color-surface);color:var(--color-ink)'
      for (const [copia, izquierda] of [
        [copiar('copia-nueva', false), 8],
        [copiar('copia-vieja', true), 80],
      ] as const) {
        copia.style.position = 'absolute'
        copia.style.top = '80px'
        copia.style.left = `${String(izquierda)}px`
        caja.append(copia)
      }
      document.body.append(caja)
    })
    await page.mouse.move(0, 0)
    const nueva = await page.locator('#copia-nueva').screenshot({ animations: 'disabled' })
    const vieja = await page.locator('#copia-vieja').screenshot({ animations: 'disabled' })
    const r = await comparar(page, nueva, vieja)
    expect(r.mismoTamano, `interruptor ${estado}: otro tamaño que con px`).toBe(true)
    expect(
      r.mayorSalto,
      `interruptor ${estado}: difiere de la geometría en px`,
    ).toBeLessThanOrEqual(8)
  }
})
