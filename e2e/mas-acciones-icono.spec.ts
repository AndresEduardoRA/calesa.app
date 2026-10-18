import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { aLaVista } from './soporte/inventario'
import { crearLead } from './soporte/leads'
import {
  delLead,
  irALeads,
  limpiarListado,
  nombre,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { capturar } from './soporte/recorrido'

// El «⋯» de una lista se dibuja con un símbolo de SVG compartido (`<use>`, 3 nodos) y no con el icono de trazos de lucide (6 nodos:
// una columna de 500 tarjetas del kanban se pasó de su presupuesto). Que cueste menos no puede costar nitidez: se compara, píxel a
// píxel, contra el mismo botón con los tres círculos escritos adentro (como era), en claro, en oscuro, con el texto al 200 % y con
// los colores forzados del sistema (donde un icono hecho con una máscara de fondo desaparece). Y conserva su nombre para el lector.
test.describe.configure({ mode: 'serial' })

const CORTO = 'Icono mas acciones'
let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  await crearLead({
    nombre: CORTO,
    telefono: `59171${String(Math.floor(Math.random() * 900000) + 100000)}`,
    deQuien: t.personas.berta,
  })
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const boton = (page: Page): Locator =>
  aLaVista(
    delLead(page, CORTO)
      .first()
      .getByRole('button', { name: /^Más acciones de / }),
  )

// Copia el botón dos veces en un rincón de la pantalla, en una posición entera (el de la tabla cae en una fracción de píxel y su
// captura sale de otro tamaño): una copia tal cual (con el `<use>` del símbolo) y otra con los tres círculos escritos adentro, como
// era con el icono de trazos. Cada una conserva el color y el fondo del botón de verdad.
async function ponerLasCopias(page: Page): Promise<{ nueva: Locator; vieja: Locator }> {
  await boton(page).evaluate((original) => {
    const copiar = (id: string, conCirculos: boolean) => {
      const copia = original.cloneNode(true) as HTMLElement
      copia.id = id
      copia.removeAttribute('data-mas-acciones')
      copia.setAttribute('aria-label', id)
      const uso = copia.querySelector('use')
      if (conCirculos) {
        for (const cx of [12, 19, 5]) {
          const circulo = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          circulo.setAttribute('cx', String(cx))
          circulo.setAttribute('cy', '12')
          circulo.setAttribute('r', '1')
          uso?.before(circulo)
        }
        uso?.remove()
      }
      return copia
    }
    // Cada copia en un múltiplo de 8 px de CSS: a 2,625 píxeles por píxel (el celular) son píxeles de pantalla enteros; en una
    // fracción el antialias cambia y dos dibujos iguales dejarían de serlo.
    const caja = document.createElement('div')
    caja.id = 'caja-de-las-copias'
    // Una pantalla lisa detrás: las esquinas redondeadas del botón dejan ver lo que haya debajo, y no debe ser distinto en cada copia.
    caja.style.cssText =
      'position:fixed;inset:0;z-index:9999;pointer-events:none;background:var(--color-surface);color:var(--color-ink)'
    const nueva = copiar('copia-nueva', false)
    const vieja = copiar('copia-vieja', true)
    for (const [copia, izquierda] of [
      [nueva, 8],
      [vieja, 80],
    ] as const) {
      copia.style.cssText += `;position:absolute;top:80px;left:${String(izquierda)}px;background:var(--color-surface);color:var(--color-ink)`
    }
    caja.append(nueva, vieja)
    document.body.append(caja)
  })
  return { nueva: page.locator('#copia-nueva'), vieja: page.locator('#copia-vieja') }
}

// Cuántos píxeles distintos hay entre dos capturas, y dónde cae lo pintado de la primera (en su interior, lejos del borde del botón).
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
      // Cuántos píxeles difieren y cuánto: el mayor salto de un canal (0 a 255).
      const canal = (imagen: Imagen, i: number) => imagen.datos[i] ?? 0
      const diferencias = (pa: Imagen, pb: Imagen) => {
        let distintos = 0
        let mayorSalto = 0
        for (let i = 0; i < pa.datos.length; i += 4) {
          const salto = Math.max(
            Math.abs(canal(pa, i) - canal(pb, i)),
            Math.abs(canal(pa, i + 1) - canal(pb, i + 1)),
            Math.abs(canal(pa, i + 2) - canal(pb, i + 2)),
          )
          distintos += salto === 0 ? 0 : 1
          mayorSalto = Math.max(mayorSalto, salto)
        }
        return { distintos, mayorSalto }
      }
      const pintado = (pa: Imagen) => {
        // El fondo es el color del píxel de arriba al medio (nunca lo toca el icono).
        const fondo = [
          pa.datos[(pa.ancho >> 1) * 4],
          pa.datos[(pa.ancho >> 1) * 4 + 1],
          pa.datos[(pa.ancho >> 1) * 4 + 2],
        ]
        const margen = Math.round(pa.ancho * 0.2)
        let pintados = 0
        let minX = pa.ancho
        let maxX = 0
        for (let py = margen; py < pa.alto - margen; py += 1) {
          for (let px = margen; px < pa.ancho - margen; px += 1) {
            const i = (py * pa.ancho + px) * 4
            const esFondo =
              pa.datos[i] === fondo[0] &&
              pa.datos[i + 1] === fondo[1] &&
              pa.datos[i + 2] === fondo[2]
            pintados += esFondo ? 0 : 1
            minX = esFondo ? minX : Math.min(minX, px)
            maxX = esFondo ? maxX : Math.max(maxX, px)
          }
        }
        return { pintados, minX, maxX }
      }
      const [pa, pb] = await Promise.all([leer(x), leer(y)])
      return {
        mismoTamano: pa.ancho === pb.ancho && pa.alto === pb.alto,
        ...diferencias(pa, pb),
        ancho: pa.ancho,
        ...pintado(pa),
      }
    },
    [a.toString('base64'), b.toString('base64')] as const,
  )
}

const CASOS = [
  { nombre: 'claro', preparar: async (page: Page) => page.emulateMedia({ colorScheme: 'light' }) },
  { nombre: 'oscuro', preparar: async (page: Page) => page.emulateMedia({ colorScheme: 'dark' }) },
  {
    nombre: 'texto al 200 %',
    preparar: async (page: Page) => {
      await page.emulateMedia({ colorScheme: 'light' })
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%'
      })
    },
  },
  {
    nombre: 'colores forzados',
    preparar: async (page: Page) =>
      page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' }),
  },
]

for (const caso of CASOS) {
  test(`el «⋯» se ve igual que con el icono de trazos, centrado y con su nombre: ${caso.nombre}`, async ({
    page,
  }, info) => {
    await entrar(page, t.personas.berta)
    await irALeads(page)
    await caso.preparar(page)
    await expect(boton(page)).toBeVisible()
    // Su nombre para el lector no cambió, y el icono no se anuncia.
    await expect(boton(page)).toHaveAccessibleName(`Más acciones de ${nombre(CORTO)}`)
    await expect(boton(page).locator('svg')).toHaveAttribute('aria-hidden', 'true')
    const { nueva, vieja } = await ponerLasCopias(page)
    await page.mouse.move(0, 0)
    const conSimbolo = await nueva.screenshot({ animations: 'disabled' })
    const conTrazos = await vieja.screenshot({ animations: 'disabled' })
    const r = await comparar(page, conSimbolo, conTrazos)
    // Para mirarlas cuando difieren (se guardan junto a la traza del fallo).
    await info.attach('con-simbolo.png', { body: conSimbolo, contentType: 'image/png' })
    await info.attach('con-trazos.png', { body: conTrazos, contentType: 'image/png' })
    info.annotations.push({
      type: 'píxeles distintos / mayor salto',
      description: `${String(r.distintos)} / ${String(r.mayorSalto)}`,
    })
    expect(r.mismoTamano).toBe(true)
    // Con el sprite se dibuja, y dibuja lo mismo que antes: con 1× son 0 píxeles de diferencia y con 2,625× (el celular) uno solo,
    // de 5 sobre 255, que es el redondeo del antialias (medido: tinta 27.103 contra 27.107, centroide a 0,002 px). Un punto corrido
    // medio píxel da más de 100.
    expect(r.pintados, 'el icono no se dibujó').toBeGreaterThan(8)
    expect(r.mayorSalto, 'difiere del icono de trazos').toBeLessThanOrEqual(8)
    // Centrado en su botón: los tres puntos ocupan el medio, con el mismo margen a los dos lados.
    expect(Math.abs(r.minX - (r.ancho - 1 - r.maxX))).toBeLessThanOrEqual(1)
    await capturar(
      page,
      info,
      `mas-acciones-${caso.nombre.replaceAll(' ', '-').replace('%', 'pct')}`,
    )
    await page.evaluate(() => {
      document.getElementById('caja-de-las-copias')?.remove()
    })
  })
}
