// Lo que usa el recorrido de la IA (`leads-recorrido.spec.ts`): una asesora con el rol `asesor` de la
// semilla, las capturas que la IA mira (sólo con `E2E_CAPTURAS`) y lo que se puede afirmar del dibujo
// sin mirarlo: quién recibe el clic, qué cabe en la pantalla, sin scroll horizontal, el tamaño táctil.
import { mkdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { expect, type Locator, type Page, type Request, type TestInfo } from '@playwright/test'
import { CONTRASENA } from './alta'
import { admin, correoDePrueba, crearPersona } from './base'
import { borrarLeadsDePrueba, exigir } from './leads'
import { fijarCodigoDePais, idDeLead, nuevoLead, type LeadDePrueba } from './leads-ficha'
import { completoCon, nacional } from './leads-ficha-telefonos'
import {
  AJENO_CARLOS,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './leads-listado'
import { borrarLotesDePrueba } from './papelera'
import { esMovil } from './inventario'
import { capturarEn } from './capturas'

// --- Capturas ----------------------------------------------------------------------------------------

// Una captura numerada por spec en `$E2E_CAPTURAS/<proyecto>/`, sólo si la variable está puesta: el
// spec permanente no deja archivos. No es una comparación de píxeles: es lo que la IA lee para juzgar
// lo que no se puede afirmar (solapamientos, redacción, jerarquía). Se toma con la pantalla quieta (`capturas.ts`).
const contadores = new Map<string, number>()

export async function capturar(page: Page, info: TestInfo, nombre: string): Promise<void> {
  const raiz = process.env['E2E_CAPTURAS']
  if (!raiz) return
  const spec = basename(info.file, '.spec.ts').replace('leads-recorrido', 'r')
  const n = (contadores.get(spec) ?? 0) + 1
  contadores.set(spec, n)
  const carpeta = join(raiz, info.project.name)
  mkdirSync(carpeta, { recursive: true })
  await capturarEn(page, join(carpeta, `${spec}-${String(n).padStart(2, '0')}-${nombre}.png`))
}

// --- Lo que se afirma sin mirar ----------------------------------------------------------------------

// Un panel que entra con animación (zoom, deslizamiento) mide menos mientras entra: se espera a que
// termine antes de medir cajas.
export async function quieto(lugar: Locator): Promise<void> {
  await lugar.evaluate((e) =>
    Promise.all(e.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined))),
  )
}

// El elemento que recibe un clic en el centro de la caja es éste (o está adentro): nada lo tapa.
export async function recibeElClic(lugar: Locator): Promise<void> {
  await expect(lugar).toBeVisible()
  const lo = await lugar.evaluate((elemento) => {
    const caja = elemento.getBoundingClientRect()
    const x = caja.left + caja.width / 2
    const y = caja.top + caja.height / 2
    const arriba = document.elementFromPoint(x, y)
    const describir = (e: Element | null) =>
      e
        ? `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''} «${e.textContent.trim().slice(0, 40)}»`
        : 'nada'
    return { recibe: arriba !== null && elemento.contains(arriba), quien: describir(arriba) }
  })
  expect(lo.recibe, `el clic lo recibe ${lo.quien}`).toBe(true)
}

// La caja entera dentro de la pantalla (con un píxel de redondeo).
export async function dentroDeLaPantalla(page: Page, lugar: Locator): Promise<void> {
  const caja = await lugar.boundingBox()
  const pantalla = page.viewportSize()
  expect(caja, 'el elemento no tiene caja').not.toBeNull()
  if (!caja || !pantalla) return
  expect(caja.x).toBeGreaterThanOrEqual(-1)
  expect(caja.y).toBeGreaterThanOrEqual(-1)
  expect(caja.x + caja.width).toBeLessThanOrEqual(pantalla.width + 1)
  expect(caja.y + caja.height).toBeLessThanOrEqual(pantalla.height + 1)
}

// Un aviso no tapa el pie de un panel (`.claude/rules/ui.md`): sus cajas no se solapan y cada botón del pie recibe el clic (el elemento
// que está en su centro es el botón, no el aviso). Con el pie pegado abajo el aviso queda por encima; con uno a media altura (un panel
// corto) no hace falta moverlo. Se mide con el aviso ya quieto: entra deslizándose.
export async function avisoNoTapaElPie(aviso: Locator, pie: Locator): Promise<void> {
  await expect
    .poll(
      async () => {
        const [a, p] = await Promise.all([aviso.boundingBox(), pie.boundingBox()])
        if (!a || !p) {
          return 'sin caja'
        }
        const separados =
          a.y + a.height <= p.y + 1 ||
          a.y >= p.y + p.height - 1 ||
          a.x + a.width <= p.x + 1 ||
          a.x >= p.x + p.width - 1
        return separados
          ? 'separados'
          : `se solapan: aviso y ${String(Math.round(a.y))}-${String(Math.round(a.y + a.height))}, pie y ${String(Math.round(p.y))}-${String(Math.round(p.y + p.height))}`
      },
      { message: 'el aviso no se solapa con el pie' },
    )
    .toBe('separados')
  const botones = pie.getByRole('button')
  const cuantos = await botones.count()
  expect(cuantos, 'el pie tiene botones').toBeGreaterThan(0)
  for (let i = 0; i < cuantos; i++) {
    await recibeElClic(botones.nth(i))
  }
}

export async function sinScrollHorizontal(page: Page): Promise<void> {
  const { ancho, visible, culpables } = await page.evaluate(() => {
    const visible = document.documentElement.clientWidth
    // Los elementos más profundos que se salen por la derecha: dicen qué ensancha la página.
    const culpables = [...document.querySelectorAll('body *')]
      .filter((e) => e.getBoundingClientRect().right > visible + 1)
      // Lo que un ancestro que se desplaza por dentro recorta (la barra de pestañas) no ensancha la página.
      .filter((e) => {
        for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) {
          if (
            getComputedStyle(a).overflowX !== 'visible' &&
            a.getBoundingClientRect().right <= visible + 1
          )
            return false
        }
        return true
      })
      .filter((e) => ![...e.children].some((h) => h.getBoundingClientRect().right > visible + 1))
      .slice(0, 5)
      .map((e) => {
        // La clase de un SVG no es un texto: se lee del atributo. Dos ancestros dicen de qué parte de la pantalla es.
        const cual = (n: Element) =>
          `${n.tagName.toLowerCase()}.${(n.getAttribute('class') ?? '').slice(0, 40)}`
        const dentro = [e.parentElement, e.parentElement?.parentElement].flatMap((n) =>
          n ? [cual(n)] : [],
        )
        return `${cual(e)} «${e.textContent.trim().slice(0, 30)}» en ${dentro.join(' < ')}`
      })
    return { ancho: document.documentElement.scrollWidth, visible, culpables }
  })
  expect(ancho, `la página se desplaza de costado: ${culpables.join(' | ')}`).toBeLessThanOrEqual(
    visible,
  )
}

// `lugar` se ve entero sin desplazar nada: su caja cae dentro de la página (`right <= clientWidth`) y ningún antecesor que se desplaza
// por dentro (una tarjeta con `overflow-x: auto`) lo recorta. `sinScrollHorizontal()` no lo ve: lo que un antecesor recorta no
// ensancha la página, pero la persona tiene que desplazar la tarjeta para llegar (reflujo, WCAG 1.4.10; 5a-16, la matriz de Roles).
export async function aLaVistaSinDesplazar(lugar: Locator, que: string): Promise<void> {
  const caja = await lugar.evaluate((e) => {
    const visible = document.documentElement.clientWidth
    const propia = e.getBoundingClientRect()
    let recortadoPor = ''
    for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      if (getComputedStyle(a).overflowX === 'visible') continue
      const c = a.getBoundingClientRect()
      if (propia.right > c.right + 0.5 || propia.left < c.left - 0.5) {
        recortadoPor = `${a.tagName.toLowerCase()}.${(a.getAttribute('class') ?? '').slice(0, 40)} (${String(Math.round(c.left))}–${String(Math.round(c.right))})`
        break
      }
    }
    return { izquierda: propia.left, derecha: propia.right, visible, recortadoPor }
  })
  expect(
    caja.derecha,
    `${que}: su borde derecho pasa el ancho de la página (${String(caja.visible)} px)`,
  ).toBeLessThanOrEqual(caja.visible + 0.5)
  expect(caja.izquierda, `${que}: queda a la izquierda de la página`).toBeGreaterThanOrEqual(-0.5)
  expect(caja.recortadoPor, `${que}: lo recorta un contenedor que se desplaza`).toBe('')
}

// Ningún texto de `lugar` queda cortado: cada elemento visible con texto propio cabe en su caja (`scrollWidth <= clientWidth`), un «B…» por
// un `truncate` que no tenía lugar lo delata, y nada se sale por la derecha de la pantalla. Nombra a los elementos que no caben.
export async function sinTextoCortado(lugar: Locator): Promise<void> {
  const cortados = await lugar.evaluate((raiz) => {
    const visible = document.documentElement.clientWidth
    const descripcion = (e: Element) =>
      `${e.tagName.toLowerCase()}.${(e.getAttribute('class') ?? '').slice(0, 30)} «${e.textContent.trim().slice(0, 30)}» (${String(e.scrollWidth)} > ${String(e.clientWidth)})`
    const conTexto = [raiz, ...raiz.querySelectorAll('*')].filter((e) =>
      [...e.childNodes].some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '',
      ),
    )
    return conTexto.flatMap((e) => {
      const caja = e.getBoundingClientRect()
      // Lo escondido y lo `sr-only` (1 px) no se ve: no cuentan.
      if (caja.width <= 1 || caja.height <= 1 || getComputedStyle(e).visibility === 'hidden')
        return []
      const sinLugar = e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1
      const fuera = caja.right > visible + 1
      return sinLugar || fuera ? [descripcion(e)] : []
    })
  })
  expect(cortados, `texto cortado: ${cortados.join(' | ')}`).toEqual([])
}

// En el celular, un objetivo táctil mide al menos 44 px de alto y de ancho (`.claude/rules/ui.md`).
export async function tactil(page: Page, lugar: Locator): Promise<void> {
  if (!esMovil(page)) return
  const caja = await lugar.boundingBox()
  expect(caja, 'el objetivo no tiene caja').not.toBeNull()
  if (!caja) return
  const nombre = (await lugar.getAttribute('aria-label')) ?? (await lugar.innerText()).trim()
  expect(Math.round(caja.height), `alto de «${nombre}»`).toBeGreaterThanOrEqual(44)
  expect(Math.round(caja.width), `ancho de «${nombre}»`).toBeGreaterThanOrEqual(44)
}

// El elemento que tiene el foco, dicho como lo nombra el lector (para los mensajes de un fallo).
export const enfocado = (page: Page) =>
  page.evaluate(() => {
    const e = document.activeElement
    return e
      ? `${e.tagName.toLowerCase()} «${e.getAttribute('aria-label') ?? e.textContent.trim().slice(0, 40)}»`
      : 'nada'
  })

// --- La asesora de la semilla ------------------------------------------------------------------------

// Una persona con el rol `asesor` tal como lo siembra `seed.sql` (no un rol «E2E …»): lo que ve y
// puede es lo de una asesora de verdad.
export async function crearAsesoraDeLaSemilla(
  proyecto: string,
): Promise<{ email: string; nombre: string }> {
  const email = correoDePrueba(`asesora-recorrido-${proyecto}`)
  const nombre = 'Ana Recorrido'
  await crearPersona({ email, contrasena: CONTRASENA, nombre, invitada: true })
  const cliente = admin()
  const { data: perfil, error } = await cliente
    .from('perfiles')
    .select('id')
    .eq('email', email)
    .single<{ id: string }>()
  exigir(error, `leer el perfil de ${email}`)
  const { data: rol, error: errorDeRol } = await cliente
    .from('roles')
    .select('id')
    .eq('clave', 'asesor')
    .single<{ id: string }>()
  exigir(errorDeRol, 'leer el rol asesor de la semilla')
  const { error: errorDeAsignar } = await cliente
    .from('usuarios_roles')
    .insert({ usuario_id: perfil?.id ?? '', rol_id: rol?.id ?? '', es_principal: true })
  exigir(errorDeAsignar, 'darle el rol asesor')
  const { error: errorDeAceptar } = await cliente
    .from('perfiles')
    .update({ invitacion_aceptada_en: new Date().toISOString() })
    .eq('id', perfil?.id ?? '')
  exigir(errorDeAceptar, 'aceptar la invitación')
  return { email, nombre }
}

// El nombre de un origen de lead activo, leído de la base (ningún texto fijo los nombra).
export async function origenActivo(): Promise<string> {
  const { data, error } = await admin()
    .from('origenes_lead')
    .select('nombre')
    .eq('activo', true)
    .order('orden')
    .limit(1)
    .single<{ nombre: string }>()
  exigir(error, 'leer un origen activo')
  return data?.nombre ?? ''
}

// --- CSV ---------------------------------------------------------------------------------------------

export const BOM = '﻿'

export function csvDe(lineas: string[], separador: ',' | ';', conBom: boolean): Buffer {
  const texto = lineas.map((l) => l.replaceAll('|', separador)).join('\r\n')
  return Buffer.from(`${conBom ? BOM : ''}${texto}\r\n`, 'utf8')
}

// El árbol accesible de un lugar, junto a las capturas (sólo con `E2E_CAPTURAS`): lo que un lector de
// pantalla anunciaría, para revisar nombres, roles e idioma sin adivinar desde la imagen.
export async function volcarArbol(lugar: Locator, info: TestInfo, nombre: string): Promise<void> {
  const raiz = process.env['E2E_CAPTURAS']
  if (!raiz) return
  const carpeta = join(raiz, info.project.name)
  mkdirSync(carpeta, { recursive: true })
  writeFileSync(join(carpeta, `${nombre}.aria.txt`), await lugar.ariaSnapshot())
}

// --- El terreno ----------------------------------------------------------------------------------------

export type TerrenoDelRecorrido = {
  t: TerrenoDelListado
  ana: { email: string; nombre: string }
  // Dos leads de la cartera de Ana.
  uno: LeadDePrueba
  dos: LeadDePrueba
  // Un lead de Carlos: Ana no lo ve.
  deCarlos: string
}

// El terreno del listado (la dueña, Berta, Carlos y sus leads) más Ana, la asesora de la semilla, con
// dos leads propios.
export async function prepararRecorrido(
  proyecto: string,
  corto: string,
): Promise<TerrenoDelRecorrido> {
  // Lo que una corrida anterior dejó (un lote de deshacer una importación) no deja borrar a las personas.
  await borrarLeadsDePrueba()
  await borrarLotesDePrueba()
  const t = await prepararListado(proyecto)
  const ana = await crearAsesoraDeLaSemilla(proyecto)
  const lead = (n: string) =>
    nuevoLead({
      corto: `${corto} ${n} ${proyecto}`,
      telefono: completoCon(t, nacional()),
      deQuien: ana.email,
    })
  const uno = await lead('Uno')
  const dos = await lead('Dos')
  await fijarCodigoDePais(uno.id, t.codigo)
  return { t, ana, uno, dos, deCarlos: await idDeLead(AJENO_CARLOS) }
}

export async function limpiarRecorrido(r: TerrenoDelRecorrido | undefined): Promise<void> {
  await borrarLeadsDePrueba()
  await borrarLotesDePrueba()
  await limpiarListado(r?.t)
}

// --- Los pedidos -------------------------------------------------------------------------------------

const esAccion = (pedido: Request) =>
  pedido.method() === 'POST' && pedido.headers()['next-action'] !== undefined

// Cada Server Action tarda `ms` más en salir (para ver el botón apagado mientras se envía) y se cuenta.
export async function demorarAcciones(page: Page, ms: number): Promise<Request[]> {
  const enviadas: Request[] = []
  await page.route('**/*', async (ruta) => {
    if (esAccion(ruta.request())) {
      enviadas.push(ruta.request())
      await new Promise((listo) => setTimeout(listo, ms))
    }
    await ruta.fallback()
  })
  return enviadas
}
