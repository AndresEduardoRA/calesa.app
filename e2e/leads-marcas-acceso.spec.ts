import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { idDe } from './soporte/leads'
import { sesionDe } from './soporte/leads-alta'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { NO_DISPONIBLE, irAFicha, nuevoLead, revocarCartera } from './soporte/leads-ficha'
import {
  irALeads,
  limpiarListado,
  mandarALaPapelera,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import {
  borrarEtiquetasDe,
  crearEtiquetaDe,
  esperarMarcaEnLaFicha,
  marcarEnLaFicha,
  marcasEnLaBase,
  menuDeFila,
  ponerEtiquetaDe,
  ponerMarcaDe,
  transferirA,
} from './soporte/leads-marcas'
import { compartirCon } from './soporte/leads-seguimientos'

// Lo que la base decide sobre las marcas, llamado a mano con la sesión de cada persona: lo que no
// se ve responde como inexistente (también al quitar), una etiqueta ajena no se usa ni se nombra,
// los topes aguantan dos pedidos a la vez, y compartir, transferir o revocar no mueven las marcas
// de nadie.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const leadDe = (deQuien: string, corto: string) =>
  nuevoLead({ corto, telefono: completoCon(t, nacional()), deQuien })

test('un lead ajeno, en la papelera o sin cartera (limbo) responde como inexistente, también al quitar', async ({}, info) => {
  const deCarlos = await leadDe(t.personas.carlos, `Acc Ajeno ${info.project.name}`)
  const papelera = await leadDe(t.personas.berta, `Acc Papelera ${info.project.name}`)
  const limbo = await leadDe(t.personas.berta, `Acc Limbo ${info.project.name}`)
  const etiqueta = await crearEtiquetaDe(t.personas.berta, `Acc ${info.project.name}`)
  // Berta lo marcó cuando lo veía; después dejó de verlo.
  await ponerMarcaDe(t.personas.berta, papelera.id, 'favorito')
  await mandarALaPapelera(papelera.id)
  await revocarCartera(limbo.id, await idDe(t.personas.berta))

  const sesion = await sesionDe(t.personas.berta, CONTRASENA)
  for (const lead of [deCarlos.id, papelera.id, limbo.id, crypto.randomUUID()]) {
    for (const [rpc, args] of [
      ['lead_favorito_poner', { p_lead: lead, p_valor: true }],
      ['lead_favorito_poner', { p_lead: lead, p_valor: false }],
      ['lead_tachado_poner', { p_lead: lead, p_valor: true }],
      ['lead_etiquetas_poner', { p_lead: lead, p_etiquetas: [etiqueta], p_valor: true }],
    ] as const) {
      const { error } = await sesion.rpc(rpc, args)
      expect(error?.message, `${rpc} sobre ${lead}`).toBe(NO_DISPONIBLE)
    }
  }
  // La marca sigue siendo suya aunque ya no vea el lead.
  expect((await marcasEnLaBase(papelera.id, t.personas.berta)).favorito).toBe(true)
  // Escribir directo en la tabla no se puede.
  const directo = await sesion
    .from('leads_favoritos')
    .insert({ lead_id: deCarlos.id, usuario_id: await idDe(t.personas.berta) })
  expect(directo.error?.code).toBe('42501')
})

test('una etiqueta de otra persona no se pone ni se nombra; dos pedidos a la vez no pasan los topes', async ({}, info) => {
  const lead = await leadDe(t.personas.berta, `Acc Topes ${info.project.name}`)
  const deCarlos = await crearEtiquetaDe(t.personas.carlos, `De Carlos ${info.project.name}`)
  const sesion = await sesionDe(t.personas.berta, CONTRASENA)
  const ajena = await sesion.rpc('lead_etiquetas_poner', {
    p_lead: lead.id,
    p_etiquetas: [deCarlos],
    p_valor: true,
  })
  const inexistente = await sesion.rpc('lead_etiquetas_poner', {
    p_lead: lead.id,
    p_etiquetas: [crypto.randomUUID()],
    p_valor: true,
  })
  expect(ajena.error?.message).toBe('No encontramos esa etiqueta. Recarga para ver las tuyas.')
  expect(inexistente.error?.message).toBe(ajena.error?.message)

  // 19 en el lead y dos pedidos a la vez, cada uno con una distinta: entra exactamente uno.
  const ids: string[] = []
  for (let i = 0; i < 21; i++) {
    ids.push(await crearEtiquetaDe(t.personas.berta, `Tope ${String(i)} ${info.project.name}`))
  }
  const { error } = await sesion.rpc('lead_etiquetas_poner', {
    p_lead: lead.id,
    p_etiquetas: ids.slice(0, 19),
    p_valor: true,
  })
  expect(error).toBeNull()
  const otra = await sesionDe(t.personas.berta, CONTRASENA)
  const [uno, dos] = await Promise.all([
    sesion.rpc('lead_etiquetas_poner', { p_lead: lead.id, p_etiquetas: [ids[19]], p_valor: true }),
    otra.rpc('lead_etiquetas_poner', { p_lead: lead.id, p_etiquetas: [ids[20]], p_valor: true }),
  ])
  expect([uno.error, dos.error].filter((e) => e === null)).toHaveLength(1)
  expect([uno.error?.message, dos.error?.message]).toContain(
    'Un lead admite hasta 20 de tus etiquetas. Quita una para poner otra.',
  )
  expect((await marcasEnLaBase(lead.id, t.personas.berta)).etiquetas).toHaveLength(20)

  // A una del tope de 50 (ya tiene 21 de este test y las del anterior), dos altas a la vez: una.
  const propias = await sesion.from('etiquetas').select('id', { count: 'exact', head: true })
  for (let i = propias.count ?? 0; i < 49; i++) {
    await crearEtiquetaDe(t.personas.berta, `Relleno ${String(i)} ${info.project.name}`)
  }
  const [a, b] = await Promise.all([
    sesion.rpc('etiqueta_crear', {
      p_id: crypto.randomUUID(),
      p_nombre: `Carrera A ${info.project.name}`,
    }),
    otra.rpc('etiqueta_crear', {
      p_id: crypto.randomUUID(),
      p_nombre: `Carrera B ${info.project.name}`,
    }),
  ])
  expect([a.error, b.error].filter((e) => e === null)).toHaveLength(1)
  expect([a.error?.message, b.error?.message]).toContain(
    'Puedes tener hasta 50 etiquetas. Elimina una para crear otra.',
  )
  const total = await sesion.from('etiquetas').select('id', { count: 'exact', head: true })
  expect(total.count).toBe(50)
  await borrarEtiquetasDe(t.personas.berta)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('compartir y transferir no mueven ni muestran las marcas; revocar saca el lead del listado y la marca queda', async ({
  page,
}, info) => {
  const corto = `Acc Compartir ${info.project.name}`
  const lead = await leadDe(t.personas.berta, corto)
  const etiqueta = await crearEtiquetaDe(t.personas.berta, `Compartida ${info.project.name}`)
  await ponerEtiquetaDe(t.personas.berta, lead.id, etiqueta)
  await ponerMarcaDe(t.personas.berta, lead.id, 'favorito')
  const berta = await idDe(t.personas.berta)
  const carlos = await idDe(t.personas.carlos)
  await compartirCon(lead.id, carlos, berta)

  // Carlos lo ve, sin las marcas de Berta, y pone las suyas.
  await entrar(page, t.personas.carlos)
  await irAFicha(page, lead.id)
  await esperarMarcaEnLaFicha(page, 'Favorito', false)
  await marcarEnLaFicha(page, 'Tachado')
  await expect
    .poll(async () => (await marcasEnLaBase(lead.id, t.personas.carlos)).tachado)
    .toBe(true)
  expect(await marcasEnLaBase(lead.id, t.personas.berta)).toEqual({
    favorito: true,
    tachado: false,
    etiquetas: [`Compartida ${info.project.name}`],
  })

  // Berta se lo transfiere: cada quien conserva lo suyo.
  await transferirA(lead.id, berta, carlos)
  expect((await marcasEnLaBase(lead.id, t.personas.berta)).favorito).toBe(true)
  expect((await marcasEnLaBase(lead.id, t.personas.carlos)).favorito).toBe(false)

  // A Berta le revocan la cartera: el lead deja de aparecerle y su marca sigue siendo suya.
  await revocarCartera(lead.id, berta)
  const pagina = await page
    .context()
    .browser()
    ?.newContext({
      baseURL: new URL(page.url()).origin,
      viewport: page.viewportSize(),
    })
  const comoBerta = await pagina?.newPage()
  if (!comoBerta) throw new Error('sin navegador')
  await entrar(comoBerta, t.personas.berta)
  await irALeads(comoBerta)
  await expect(menuDeFila(comoBerta, corto)).toHaveCount(0)
  expect((await marcasEnLaBase(lead.id, t.personas.berta)).favorito).toBe(true)
  await pagina?.close()
})
