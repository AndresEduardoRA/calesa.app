import { expect, test, type Page } from './soporte/prueba'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { ingresar } from './soporte/pasos'
import { textoGrandeAlCargar } from './soporte/recorrido'

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

// 5a-25: el interruptor «Activa» de Empresa › Integraciones quedaba pegado al borde de su tarjeta al 200 % en el celular (borde derecho en x = 380, el
// de la tarjeta; el relleno son 32 px). La causa no era la palabra más larga de su texto (la columna mide 186 px y cabe) sino el cuerpo de la tarjeta:
// una grilla de columna `auto`, que toma el ancho mínimo de lo que no se parte. El botón «Guardar configuración» de apibara (`nowrap`, 315 px) la
// ensanchaba sobre sus 282 px útiles, y con ella la fila del interruptor. Ahora el cuerpo de `<Bloque>` es `minmax(0, 1fr)`. Cada interruptor de una
// tarjeta deja al menos 16 px entre su borde derecho y el de la tarjeta, con el texto al 200 % desde la carga (al 100 % quedan 17 y al 200 % en
// escritorio, 33).
const MARGEN_MINIMO = 16

// Las pantallas con un `<Interruptor>` dentro de un `<Bloque>`; el segundo dato es el bloque que nace plegado y hay que abrir.
const PANTALLAS_CON_TARJETA = [
  ['/configuracion/empresa?seccion=empresa', 'Políticas'],
  ['/configuracion/empresa?seccion=integraciones', null],
] as const

async function margenesConLaTarjeta(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-slot=interruptor]')].flatMap((raiz) => {
      const tarjeta = raiz.closest('[data-slot=bloque]')
      const pista = raiz.querySelector('[data-slot=switch]')
      if (!tarjeta || !pista) return []
      const t = tarjeta.getBoundingClientRect()
      const p = pista.getBoundingClientRect()
      if (p.width === 0) return []
      return [{ titulo: raiz.querySelector('span')?.textContent ?? '', margen: t.right - p.right }]
    }),
  )
}

test('al 200 %: el interruptor deja 16 px o más entre su borde y el de su tarjeta', async ({
  page,
}) => {
  await textoGrandeAlCargar(page)
  await entrar(page)
  for (const [url, plegado] of PANTALLAS_CON_TARJETA) {
    await page.goto(url)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    if (plegado) await page.locator('summary', { hasText: plegado }).click()
    const margenes = await margenesConLaTarjeta(page)
    expect(margenes.length, `${url}: ningún interruptor dentro de una tarjeta`).toBeGreaterThan(0)
    for (const { titulo, margen } of margenes) {
      expect(
        margen,
        `${url}: el interruptor «${titulo}» queda a ${String(Math.round(margen))} px del borde de su tarjeta`,
      ).toBeGreaterThanOrEqual(MARGEN_MINIMO)
    }
  }
})

// La columna de texto del interruptor cede y parte lo que no cabe: una palabra larga en su ayuda (el nombre de un campo, un enlace) no saca al
// `<Switch>` de su fila ni de su tarjeta. Se la pone a mano en el DOM (sin guiones: el navegador parte donde los hay): ninguna pantalla trae hoy una palabra así.
test('al 200 %: una palabra larga en la ayuda se parte y el interruptor sigue dentro de su tarjeta', async ({
  page,
}) => {
  await textoGrandeAlCargar(page)
  await entrar(page)
  await page.goto('/configuracion/empresa?seccion=integraciones')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const raiz = page.locator('[data-slot=interruptor]').first()
  await raiz.evaluate((el) => {
    const ayuda = el.querySelectorAll('span')[1]
    if (ayuda)
      ayuda.textContent = 'https://integraciones.ejemplo.com/' + 'unapalabralarga'.repeat(12)
  })
  const [margen] = await margenesConLaTarjeta(page)
  expect(margen?.margen ?? -1, 'el interruptor sigue dentro de su tarjeta').toBeGreaterThanOrEqual(
    MARGEN_MINIMO,
  )
  // (No `scrollWidth`: la zona táctil del `<Switch>` sobresale de su fila a propósito.) La columna de texto termina antes que el interruptor y su
  // texto no pasa de ella.
  const { hastaElSwitch, sobraDeLaColumna } = await raiz.evaluate((el) => {
    const columna = el.firstElementChild
    const pista = el.querySelector('[data-slot=switch]')
    const ayuda = columna?.querySelectorAll('span')[1]
    if (!columna || !pista || !ayuda)
      return { hastaElSwitch: -Infinity, sobraDeLaColumna: Infinity }
    return {
      hastaElSwitch: pista.getBoundingClientRect().left - columna.getBoundingClientRect().right,
      sobraDeLaColumna: ayuda.scrollWidth - columna.clientWidth,
    }
  })
  expect(hastaElSwitch, 'el texto no se mete bajo el interruptor').toBeGreaterThanOrEqual(0)
  expect(sobraDeLaColumna, 'el texto no pasa de su columna').toBeLessThanOrEqual(0)
})
