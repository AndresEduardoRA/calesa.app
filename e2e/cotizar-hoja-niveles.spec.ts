import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import {
  fichasDelDom,
  fichasDelRsc,
  fichasDeUnJson,
  filtrados,
  trae,
  vigilarRecalculos,
  type Ficha,
  type Oculto,
} from './soporte/cotizar'
import {
  MARCA,
  OCULTO,
  VISIBLE_SIN_COSTOS,
  borrarOrigenesDeCotizar,
  crearOrigenDeCotizar,
  ocultoDeUnaFormulaSembrada,
  ordenDeclarado,
} from './soporte/cotizar-formula'
import { capturar } from './soporte/recorrido'
import { sql } from './soporte/sql'

// Lo que quien mira no ve no llega: ni al DOM, ni al payload del documento, ni a la respuesta del recálculo (paso 4.13-2, D7). Se compara ESTRUCTURA, no texto: la lista exacta de
// los nodos y secciones dibujados, y —en el DOM, en el payload RSC del documento y en cada respuesta de `cotizacion_evaluar`— toda clave y toda hoja contra el conjunto oculto (ids y
// etiquetas por igualdad, valores como número). Una persona que ve «todos» y otra que ve «costos» (los niveles de fábrica); la prueba muerde: el mismo detector encuentra todo en
// lo que ve «costos».
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let origen = { id: '', nombre: '' }
let todos = ''
let costos = ''

const ROL = (nombre: string) => ({
  nombre: `${PREFIJO_ROL_E2E}${nombre} ${proyecto}`,
  clave: `e2e_${nombre.toLowerCase().replaceAll(' ', '_')}_${proyecto}`,
})

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  origen = await crearOrigenDeCotizar(proyecto, 'niv', true)
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-niveles-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Niveles',
  })
  todos = correoDePrueba(`todos-niveles-${proyecto}`)
  costos = correoDePrueba(`costos-niveles-${proyecto}`)
  await crearPersona({ email: todos, contrasena: CONTRASENA, nombre: 'Tito Todos', invitada: true })
  await darRolDePrueba({
    email: todos,
    rol: ROL('Ve todos'),
    permisos: ['cotizaciones.ver', 'cotizaciones.crear'],
  })
  await crearPersona({
    email: costos,
    contrasena: CONTRASENA,
    nombre: 'Cleo Costos',
    invitada: true,
  })
  await darRolDePrueba({
    email: costos,
    rol: ROL('Ve costos'),
    permisos: [
      'cotizaciones.ver',
      'cotizaciones.crear',
      'cotizaciones.nivel.costos.ver',
      'cotizaciones.nivel.costos.editar',
    ],
  })
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const celda = (page: Page, nodo: string) => page.locator(`[data-nodo="${nodo}"]`)

async function tipear(page: Page, nodo: string, texto: string): Promise<void> {
  const entrada = celda(page, nodo).locator('input')
  await expect(async () => {
    if (!(await entrada.isVisible())) {
      await celda(page, nodo).locator('[data-parada="0"]').click()
    }
    await expect(entrada).toBeVisible({ timeout: 500 })
  }).toPass()
  await entrada.fill(texto)
  await entrada.press('Enter')
  await expect(entrada).toBeHidden()
}

const lista = (page: Page, atributo: string) =>
  page.locator(`[${atributo}]`).evaluateAll((es, a) => es.map((e) => e.getAttribute(a)), atributo)

type Visto = {
  secciones: (string | null)[]
  nodos: (string | null)[]
  dom: Ficha[]
  rsc: { texto: string; fichas: Ficha[] }
  respuestas: unknown[]
  html: string
}

// Abre la hoja como `correo`, recalcula una vez (así hay una respuesta del navegador) y junta todo lo que esa persona recibió, por cada canal.
async function verComo(
  page: Page,
  correo: string,
  url: string,
  celdaATipear: string,
): Promise<Visto> {
  const vigilante = await vigilarRecalculos(page)
  await page.context().clearCookies()
  await entrar(page, correo, { fresco: true })
  const respuesta = await page.goto(url)
  const cuerpo = (await respuesta?.text()) ?? ''
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await tipear(page, celdaATipear, '100')
  await expect.poll(() => vigilante.respuestas.length).toBeGreaterThan(0)
  return {
    secciones: await lista(page, 'data-seccion'),
    nodos: await lista(page, 'data-nodo'),
    dom: await fichasDelDom(page),
    rsc: fichasDelRsc(cuerpo),
    respuestas: vigilante.respuestas,
    html: await page.content(),
  }
}

const delRecalculo = (v: Visto) => v.respuestas.flatMap((r) => fichasDeUnJson(r))

// Lo que aparece de `oculto` por cada canal.
const hallazgos = (v: Visto, oculto: Oculto) => ({
  dom: filtrados(v.dom, oculto),
  rsc: filtrados(v.rsc.fichas, oculto),
  recalculo: filtrados(delRecalculo(v), oculto),
})

test('en la fórmula de prueba, quien ve «todos» no recibe ni un id, una etiqueta ni un valor de lo que esconde el nivel', async ({
  page,
}, info) => {
  const v = await verComo(page, todos, `/cotizaciones/nuevo?origen=${origen.id}`, 'pub')
  expect(v.secciones).toEqual(['abierta', 'solo_editar'])
  expect(v.nodos).toEqual(VISIBLE_SIN_COSTOS)
  expect(hallazgos(v, OCULTO)).toEqual({ dom: [], rsc: [], recalculo: [] })
  expect(trae(v.rsc.texto, MARCA)).toBe(false)
  expect(trae(v.html, MARCA)).toBe(false)
  await capturar(page, info, 'cotizar-niveles-todos')
})

test('quien ve «costos» recibe todo eso, por los tres canales: así se ve que la prueba muerde', async ({
  page,
}, info) => {
  const v = await verComo(page, costos, `/cotizaciones/nuevo?origen=${origen.id}`, 'pub')
  expect(v.secciones).toEqual(['abierta', 'solo_editar', 'del_nivel'])
  expect(v.nodos).toEqual([
    ...VISIBLE_SIN_COSTOS,
    'oculta_b',
    'tc_x',
    'x_celda',
    'x_tabla',
    'x_sub',
  ])
  const h = hallazgos(v, OCULTO)
  for (const canal of [h.dom, h.rsc, h.recalculo]) {
    expect(canal.length).toBeGreaterThan(0)
  }
  expect(h.dom).toEqual(
    expect.arrayContaining([`texto «${OCULTO.etiquetas[0]}»`, 'texto «x_celda»']),
  )
  expect(h.rsc).toEqual(expect.arrayContaining(['texto «x_celda»', 'número 9191.5']))
  expect(h.recalculo).toEqual(expect.arrayContaining(['texto «x_celda»', 'texto «tc_x»']))
  expect(trae(v.rsc.texto, MARCA)).toBe(true)
  expect(await lista(page, 'data-atajos')).toEqual(['x_tabla'])
  await capturar(page, info, 'cotizar-niveles-costos')
})

test('una celda cuya bandera esconde el nivel llega apagada y sin nombrar nada; con el nivel se ve el interruptor y se habilita', async ({
  page,
}) => {
  const vigilante = await vigilarRecalculos(page)
  await page.context().clearCookies()
  await entrar(page, todos, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}`)
  await expect(celda(page, 'cond_oc')).toContainText('Está apagada en esta hoja.')
  await expect(page.getByRole('switch', { name: /OCULTAB/ })).toHaveCount(0)
  await tipear(page, 'pub', '1')
  await expect.poll(() => vigilante.respuestas.length).toBe(1)
  // El recálculo SÍ dice, de la celda visible, que está apagada: lo que la hoja muestra sale de ahí y no de la lectura (que le quitó la bandera).
  const estados = (vigilante.respuestas[0] as { estados: Record<string, string> }).estados
  expect(estados['cond_oc']).toBe('condicion_apagada')
  expect(Object.keys(estados)).not.toContain('oculta_b')

  await page.context().clearCookies()
  await entrar(page, costos, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}`)
  await expect(celda(page, 'cond_oc')).toContainText(`Se habilita con «${OCULTO.etiquetas[1]}».`)
  await celda(page, 'oculta_b').getByRole('switch').click()
  await expect(celda(page, 'cond_oc')).not.toContainText('Se habilita con')
  await tipear(page, 'cond_oc', '40')
  await expect(page.locator('[data-total]')).toContainText('45,00')
})

test('lo que se ve y no se edita lleva su motivo; con el nivel se edita', async ({ page }) => {
  await vigilarRecalculos(page)
  await page.context().clearCookies()
  await entrar(page, todos, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}`)
  await expect(celda(page, 'solo_n')).toContainText('Lo edita quien tiene el nivel «Costos».')
  await page.context().clearCookies()
  await entrar(page, costos, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}`)
  await expect(celda(page, 'solo_n')).not.toContainText('Lo edita quien tiene el nivel')
  await tipear(page, 'solo_n', '60')
  await expect(page.locator('[data-total]')).toContainText('65,00')
})

test('en la fórmula sembrada de la subasta, quien ve «todos» no recibe ninguno de los nodos de las secciones de «costos»', async ({
  page,
}, info) => {
  const oculto = ocultoDeUnaFormulaSembrada('subasta_usa', 'costos')
  expect(oculto.ids.length).toBeGreaterThan(10)
  const buscado: Oculto = { ids: oculto.ids, etiquetas: oculto.etiquetas, numeros: [] }
  const url = `/cotizaciones/nuevo?origen=${sql("select id from public.origenes where clave = 'subasta_usa'")}`
  const orden = ordenDeclarado('subasta_usa')
  expect(orden.secciones).toEqual(expect.arrayContaining(['cif', 'impuestos', 'poliza']))

  const sin = await verComo(page, todos, url, 'remate')
  expect(sin.secciones).toEqual(
    orden.secciones.filter((s) => !['cif', 'impuestos', 'poliza'].includes(s)),
  )
  expect(hallazgos(sin, buscado)).toEqual({ dom: [], rsc: [], recalculo: [] })
  expect(sin.nodos.some((n) => oculto.ids.includes(n ?? ''))).toBe(false)
  await capturar(page, info, 'cotizar-subasta-todos')

  const con = await verComo(page, costos, url, 'remate')
  expect(con.secciones).toEqual(orden.secciones)
  expect(con.nodos).toEqual(orden.nodos)
  const h = hallazgos(con, buscado)
  expect(h.dom.length).toBeGreaterThan(0)
  expect(h.rsc.length).toBeGreaterThan(0)
  expect(h.recalculo.length).toBeGreaterThan(0)
  await capturar(page, info, 'cotizar-subasta-costos')
})
