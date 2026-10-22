import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { aLaVista, cerrarPanelDeFiltros, panelDeFiltros } from './soporte/inventario'
import { crearLead, exigir } from './soporte/leads'
import { borrarCampoDePrueba, crearCampoDePrueba } from './soporte/leads-alta'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { nuevoLead } from './soporte/leads-ficha'
import {
  delLead,
  fila,
  irALeads,
  limpiarListado,
  prepararListado,
  sinResultados,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import {
  borrarEtiquetasDe,
  crearEtiquetaDe,
  dialogoDeEtiquetas,
  ponerEtiquetaDe,
  ponerMarcaDe,
} from './soporte/leads-marcas'
import { vistasDe } from './soporte/vehiculos'

// El listado con las marcas de quien mira: los tachados se ocultan por defecto (y el aviso dice
// cuántos, con «Mostrarlos»), salvo mientras se busca; favoritos y etiquetas («cualquiera de»)
// filtran solos, combinados con los demás filtros, la búsqueda y la paginación; las vistas los
// guardan; una etiqueta borrada o una URL escrita a mano se dicen sin romper.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const leadDeBerta = (corto: string, atributos?: Record<string, unknown>) =>
  nuevoLead({
    corto,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
    ...(atributos ? { atributos } : {}),
  })

test('un tachado se oculta por defecto, el aviso lo cuenta y «Mostrarlos» lo trae marcado', async ({
  page,
}, info) => {
  const tachado = `Fil Tachado ${info.project.name}`
  const visible = `Fil Visible ${info.project.name}`
  const lead = await leadDeBerta(tachado, { e2e_color: 'verde' })
  await leadDeBerta(visible, { e2e_color: 'verde' })
  await ponerMarcaDe(t.personas.berta, lead.id, 'tachado')
  await entrar(page, t.personas.berta)
  await irALeads(page, '?a.e2e_color=verde')
  await expect(fila(page, visible)).toBeVisible()
  await expect(fila(page, tachado)).toHaveCount(0)
  // Cuenta sólo lo que cumple los filtros (el tachado verde), no todos los tachados.
  const aviso = page.getByRole('status').filter({ hasText: /oculto porque lo tachaste/ })
  await expect(aviso).toHaveText(/1 lead que coincide está oculto porque lo tachaste\./)
  await aviso.getByRole('button', { name: 'Mostrarlos' }).click()
  await expect(page).toHaveURL(/tachados=incluir/)
  await expect(page).toHaveURL(/a\.e2e_color=verde/)
  await expect(delLead(page, tachado).getByText('Tachado', { exact: true })).toBeVisible()
  await expect(fila(page, visible)).toBeVisible()

  // «Solo los tachados» desde el panel.
  const panel = await panelDeFiltros(page)
  await panel.getByRole('radio', { name: 'Solo los tachados' }).check()
  await cerrarPanelDeFiltros(page)
  await expect(page).toHaveURL(/tachados=solo/)
  await expect(fila(page, tachado)).toBeVisible()
  await expect(fila(page, visible)).toHaveCount(0)

  // Volver a «Ocultarlos» borra el parámetro: es el valor por defecto.
  const otra = await panelDeFiltros(page)
  await otra.getByRole('radio', { name: 'Ocultarlos' }).check()
  await cerrarPanelDeFiltros(page)
  await expect(page).not.toHaveURL(/tachados=/)
  await expect(fila(page, tachado)).toHaveCount(0)
})

test('buscar encuentra un tachado (marcado), y si todo lo que coincide está tachado lo dice', async ({
  page,
}, info) => {
  const corto = `Fil Buscado ${info.project.name}`
  const lead = await leadDeBerta(corto, { e2e_color: 'violeta' })
  await ponerMarcaDe(t.personas.berta, lead.id, 'tachado')
  await entrar(page, t.personas.berta)
  await irALeads(page, `?q=${encodeURIComponent(`Buscado ${info.project.name}`)}`)
  await expect(fila(page, corto)).toBeVisible()
  await expect(delLead(page, corto).getByText('Tachado', { exact: true })).toBeVisible()
  await expect(page.getByText(/oculto porque lo tachaste/)).toHaveCount(0)
  // Por número también.
  await irALeads(page, `?q=%23${String(lead.numeroPropio)}`)
  await expect(fila(page, corto)).toBeVisible()

  // Sin búsqueda, el único violeta está tachado: no es «Nada coincide», es «está tachado».
  await irALeads(page, '?a.e2e_color=violeta')
  await expect(aLaVista(page.getByText('Lo que coincide está tachado'))).toBeVisible()
  await expect(sinResultados(page)).toHaveCount(0)
  await aLaVista(page.getByRole('button', { name: 'Mostrarlos' })).click()
  await expect(fila(page, corto)).toBeVisible()
})

test('favoritos y etiquetas filtran, con un atributo, con la búsqueda y paginando', async ({
  page,
}, info) => {
  const etiqueta = `Pagina ${info.project.name}`
  const id = await crearEtiquetaDe(t.personas.berta, etiqueta, 'turquesa')
  const otra = await crearEtiquetaDe(t.personas.berta, `Otra ${info.project.name}`)
  // 52 leads con la etiqueta (más de una página de 50) y uno con la otra.
  const ids: string[] = []
  for (let i = 0; i < 52; i++) {
    ids.push(
      await crearLead({
        nombre: `Fil Pag ${String(i).padStart(2, '0')} ${info.project.name}`,
        telefono: completoCon(t, nacional()),
        deQuien: t.personas.berta,
        atributos: { e2e_color: i === 0 ? 'ambar' : 'gris' },
      }),
    )
  }
  const { error } = await admin()
    .from('leads_etiquetas')
    .insert(ids.map((lead) => ({ lead_id: lead, etiqueta_id: id })))
  exigir(error, 'etiquetar los leads')
  const conLaOtra = await leadDeBerta(`Fil Otra ${info.project.name}`)
  await ponerEtiquetaDe(t.personas.berta, conLaOtra.id, otra)
  await ponerMarcaDe(t.personas.berta, ids[0] ?? '', 'favorito')

  await entrar(page, t.personas.berta)
  await irALeads(page)
  const panel = await panelDeFiltros(page)
  const marcas = panel.getByRole('region', { name: 'Tus marcas' })
  await expect(marcas.getByText('Solo las ves tú.')).toBeVisible()
  await marcas.getByRole('checkbox', { name: etiqueta }).check()
  await cerrarPanelDeFiltros(page)
  await expect(page).toHaveURL(new RegExp(`etiqueta=${id}`))
  await expect(page.locator('tbody tr, li article').filter({ visible: true })).toHaveCount(50)
  await expect(fila(page, `Fil Otra ${info.project.name}`)).toHaveCount(0)
  await aLaVista(page.getByRole('link', { name: 'Siguiente' })).click()
  await expect(page).toHaveURL(/cursor=/)
  await expect(page).toHaveURL(new RegExp(`etiqueta=${id}`))
  await expect(page.locator('tbody tr, li article').filter({ visible: true })).toHaveCount(2)

  // «Cualquiera de»: las dos etiquetas suman.
  await irALeads(page, `?etiqueta=${id},${otra}&q=${encodeURIComponent('Fil Otra')}`)
  await expect(fila(page, `Fil Otra ${info.project.name}`)).toBeVisible()
  // Con un atributo y favoritos: sólo el ámbar favorito.
  await irALeads(page, `?etiqueta=${id}&a.e2e_color=ambar&favoritos=si`)
  await expect(page.locator('tbody tr, li article').filter({ visible: true })).toHaveCount(1)
  await expect(fila(page, `Fil Pag 00 ${info.project.name}`)).toBeVisible()
  await borrarEtiquetasDe(t.personas.berta)
})

test('una vista guarda las marcas; si su etiqueta se borró, o la URL trae algo raro, se dice', async ({
  page,
}, info) => {
  const corto = `Fil Vista ${info.project.name}`
  const lead = await leadDeBerta(corto)
  const etiqueta = `Vista ${info.project.name}`
  const id = await crearEtiquetaDe(t.personas.berta, etiqueta)
  await ponerEtiquetaDe(t.personas.berta, lead.id, id)
  await entrar(page, t.personas.berta)
  await irALeads(page, `?etiqueta=${id}&tachados=incluir`)
  await expect(fila(page, corto)).toBeVisible()
  await page.getByRole('button', { name: 'Vistas' }).click()
  await page.getByLabel('Guardar los filtros de ahora').fill(`Etiquetada ${info.project.name}`)
  await page.getByRole('button', { name: 'Guardar vista' }).click()
  await expect(page.getByText(`Vista «Etiquetada ${info.project.name}» guardada`)).toBeVisible()
  expect(await vistasDe(t.personas.berta)).toContainEqual({
    nombre: `Etiquetada ${info.project.name}`,
    params: { etiqueta: id, tachados: 'incluir' },
  })

  // Se borra la etiqueta: la vista se aplica sin ese filtro y lo dice.
  const { error } = await admin().from('etiquetas').delete().eq('id', id)
  exigir(error, 'borrar la etiqueta')
  await irALeads(page)
  await page.getByRole('button', { name: 'Vistas' }).click()
  await page.getByRole('button', { name: `Etiquetada ${info.project.name}`, exact: true }).click()
  await expect(page.getByText('Se quitó del filtro una etiqueta que ya no existe.')).toBeVisible()
  await expect(fila(page, corto)).toBeVisible()
  await page.getByRole('button', { name: 'Entendido' }).click()
  await expect(page).not.toHaveURL(/etiqueta=/)
  await expect(page).toHaveURL(/tachados=incluir/)

  // A mano: un id mal escrito y un valor raro de tachados no rompen nada.
  await irALeads(page, '?etiqueta=no-es-un-id,123&tachados=quizas&favoritos=talvez')
  await expect(
    page.getByText('Se quitaron del filtro 2 etiquetas que ya no existen.'),
  ).toBeVisible()
  await expect(fila(page, corto)).toBeVisible()
  await expect(page.getByRole('list', { name: 'Filtros activos' })).toHaveCount(0)
})

test('con un campo propio llamado «tachado», cada filtro va en su sección y no se pisan', async ({
  page,
}, info) => {
  const corto = `Fil Campo ${info.project.name}`
  await crearCampoDePrueba({ clave: 'tachado', etiqueta: 'Tachado (dato)', filtrable: true })
  try {
    const lead = await leadDeBerta(corto, { tachado: 'sipi' })
    await entrar(page, t.personas.berta)
    await irALeads(page)
    const panel = await panelDeFiltros(page)
    await expect(
      panel.getByRole('region', { name: 'Tus marcas' }).getByText('Tachados', { exact: true }),
    ).toBeVisible()
    const datos = panel.getByRole('region', { name: 'Datos del lead' })
    await datos.getByLabel('Tachado (dato)').fill('sip')
    await cerrarPanelDeFiltros(page)
    await expect(page).toHaveURL(/a\.tachado=sip/)
    await expect(page).not.toHaveURL(/[?&]tachados=/)
    await expect(fila(page, corto)).toBeVisible()
    // Tacharlo (la marca) lo oculta aunque el dato diga otra cosa.
    await ponerMarcaDe(t.personas.berta, lead.id, 'tachado')
    await page.reload()
    await expect(fila(page, corto)).toHaveCount(0)
  } finally {
    await borrarCampoDePrueba('tachado')
  }
})

test('«Gestionar etiquetas» se abre desde los filtros; en el celular reemplaza la hoja', async ({
  page,
}) => {
  await entrar(page, t.personas.berta)
  await irALeads(page)
  const panel = await panelDeFiltros(page)
  await panel.getByRole('button', { name: 'Gestionar etiquetas' }).click()
  await expect(dialogoDeEtiquetas(page)).toBeVisible()
  await expect(page).toHaveURL(/panel=etiquetas/)
  // Nunca dos paneles a la vez: en el celular la hoja de filtros se cerró.
  await expect(page.getByRole('dialog', { name: 'Filtros' })).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(dialogoDeEtiquetas(page)).toBeHidden()
  await expect(page).not.toHaveURL(/panel=/)
})
