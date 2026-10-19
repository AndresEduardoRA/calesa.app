import { expect, test, type Page } from './soporte/prueba'
import { desmontarSubasta, prepararSubasta, type EstadoDeApibara } from './soporte/apibara'
import { admin } from './soporte/base'
import { aLaVista, cerrarPanelDeFiltros, entrar, panelDeFiltros } from './soporte/inventario'

// La limpieza automática de los vehículos de subasta contra la app compilada y el Supabase local:
// el filtro «Se limpiará pronto», la insignia, el banner de la ficha con «Conservar», el job
// (acotado a este origen y con «ahora» inyectado: el de verdad no se toca), el lote en la papelera
// y restaurarlo, y el interruptor y los días de gracia. Sin llamadas a apibara. Una sola historia.
test.describe.configure({ mode: 'serial' })

const DIA_MS = 86_400_000
const T = {
  pronto: 'Limpieza Pronto',
  lejos: 'Limpieza Lejos',
  vitrina: 'Limpieza En Vitrina',
  manual: 'Limpieza Manual',
  conservado: 'Limpieza Conservado',
}

let duena = ''
let subasta = { id: '', nombre: '' }
let apibaraAntes: EstadoDeApibara
let ajustesAntes = { limpieza_automatica: true, limpieza_dias_gracia: 7 }
const ids: Record<string, string> = {}
const lotes: string[] = []
const corridas: string[] = []

function exigir(error: { message: string } | null, que: string): void {
  if (error) {
    throw new Error(`No se pudo ${que}: ${error.message}`)
  }
}

// «dd/mm» de un día `YYYY-MM-DD`: lo que dice la pantalla.
const dm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`

async function limpiezaEl(titulo: string): Promise<string | null> {
  const { data, error } = await admin()
    .from('vehiculos')
    .select('limpieza_el')
    .eq('id', ids[titulo] ?? '')
    .single<{ limpieza_el: string | null }>()
  exigir(error, `leer la fecha de limpieza de ${titulo}`)
  return data?.limpieza_el ?? null
}

test.beforeAll(async ({}, info) => {
  const terreno = await prepararSubasta(info.project.name, ['vehiculos.papelera.purgar'])
  ;({ duena, subasta, apibaraAntes } = terreno)
  const antes = await admin()
    .from('ajustes_empresa')
    .select('limpieza_automatica, limpieza_dias_gracia')
    .eq('id', 1)
    .single<typeof ajustesAntes>()
  exigir(antes.error, 'leer los ajustes de la empresa')
  ajustesAntes = antes.data ?? ajustesAntes
  exigir(
    (
      await admin()
        .from('ajustes_empresa')
        .update({ limpieza_automatica: true, limpieza_dias_gracia: 7 })
        .eq('id', 1)
    ).error,
    'dejar la limpieza encendida',
  )

  const hace = (dias: number) => new Date(Date.now() - dias * DIA_MS).toISOString()
  // «Pronto»: terminó hace 5 días: con 7 de gracia se va dentro de 2 o 3, según la hora. «Lejos»:
  // terminó ayer. Ninguno vence hoy: el job de verdad no los toca mientras corre esta prueba.
  const base = { origen_id: subasta.id, importado_apibara: true, estado_subasta: 'terminada' }
  const filas = [
    { titulo: T.pronto, subasta_en: hace(5), apibara_sync_en: hace(5) },
    { titulo: T.lejos, subasta_en: hace(1), apibara_sync_en: hace(1) },
    { titulo: T.vitrina, subasta_en: hace(5), apibara_sync_en: hace(5), publicado_web: true },
    { titulo: T.manual, subasta_en: hace(5), importado_apibara: false },
    { titulo: T.conservado, subasta_en: hace(5), apibara_sync_en: hace(5) },
  ]
  for (const fila of filas) {
    const { data, error } = await admin()
      .from('vehiculos')
      .insert({ ...base, ...fila })
      .select('id')
      .single<{ id: string }>()
    exigir(error, `cargar ${fila.titulo}`)
    ids[fila.titulo] = data?.id ?? ''
  }
  exigir(
    (
      await admin()
        .from('vehiculos_conservados')
        .insert({ vehiculo_id: ids[T.conservado] ?? '' })
    ).error,
    'marcar un vehículo como conservado',
  )
})

test.afterAll(async () => {
  // En `finally`: si algo de la limpieza falla, apibara se restaura igual y no queda apagada.
  try {
    exigir(
      (await admin().from('ajustes_empresa').update(ajustesAntes).eq('id', 1)).error,
      'restaurar los ajustes de la empresa',
    )
    // Los lotes de la limpieza no tienen autor (no los alcanza el borrado por persona) y los que se
    // restauraron recuerdan quién: se borran después de sus vehículos y antes de las personas.
    const cliente = admin()
    const { data } = await cliente
      .from('vehiculos')
      .select('lote_papelera_id')
      .eq('origen_id', subasta.id)
      .not('lote_papelera_id', 'is', null)
      .returns<{ lote_papelera_id: string }[]>()
    const delOrigen = (data ?? []).map((una) => una.lote_papelera_id)
    exigir(
      (await cliente.from('vehiculos').delete().eq('origen_id', subasta.id)).error,
      'borrar los vehículos',
    )
    if (corridas.length > 0) {
      exigir(
        (await cliente.from('limpieza_corridas').delete().in('id', corridas)).error,
        'borrar las corridas',
      )
    }
    const todos = [...new Set([...lotes, ...delOrigen])]
    if (todos.length > 0) {
      exigir(
        (await cliente.from('lotes_papelera').delete().in('id', todos)).error,
        'borrar los lotes',
      )
    }
  } finally {
    await desmontarSubasta(apibaraAntes)
  }
})

async function irAlListado(page: Page, filtro = ''): Promise<void> {
  await page.goto(`/vehiculos?origen=${subasta.id}${filtro}`)
  await expect(page).toHaveURL(new RegExp(`origen=${subasta.id}`))
}

const fila = (page: Page, titulo: string) =>
  aLaVista(page.locator('tbody tr, li article').filter({ hasText: titulo }))

test('el filtro «Se limpiará pronto» deja sólo lo que se va en los próximos días', async ({
  page,
}) => {
  await entrar(page, duena)
  await irAlListado(page)
  // Todos están en el listado; sólo «Pronto» dice cuándo se va.
  for (const titulo of Object.values(T)) {
    await expect(fila(page, titulo)).toBeVisible()
  }
  const dia = await limpiezaEl(T.pronto)
  expect(dia).not.toBeNull()
  await expect(fila(page, T.pronto)).toContainText(`Se limpia el ${dm(dia ?? '')}`)
  for (const titulo of [T.lejos, T.vitrina, T.manual, T.conservado]) {
    await expect(fila(page, titulo)).not.toContainText('Se limpia el')
  }
  // Lo retenido (vitrina, conservado) y lo manual no tienen fecha; lo lejano la tiene fuera de ventana.
  expect(await limpiezaEl(T.vitrina)).toBeNull()
  expect(await limpiezaEl(T.manual)).toBeNull()
  expect(await limpiezaEl(T.conservado)).toBeNull()
  expect(await limpiezaEl(T.lejos)).not.toBeNull()

  // El filtro, desde el panel (en el celular es una hoja).
  const panel = await panelDeFiltros(page)
  await panel.getByRole('group', { name: 'Se limpiará pronto' }).getByLabel('Sí').check()
  await cerrarPanelDeFiltros(page)
  await expect(page).toHaveURL(/limpieza=si/)
  await expect(fila(page, T.pronto)).toBeVisible()
  for (const titulo of [T.lejos, T.vitrina, T.manual, T.conservado]) {
    await expect(fila(page, titulo)).toHaveCount(0)
  }
  await expect(page.getByText('Se limpiará pronto: sí').first()).toBeVisible()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('la ficha avisa con la misma fecha, y Conservar lo saca de la limpieza sin mover la ficha', async ({
  page,
}) => {
  await entrar(page, duena)
  const dia = await limpiezaEl(T.pronto)
  const antes = await admin()
    .from('vehiculos')
    .select('actualizado_en')
    .eq('id', ids[T.pronto] ?? '')
    .single<{ actualizado_en: string }>()
  await page.goto(`/vehiculos/${ids[T.pronto]}`)
  const banner = page.getByRole('region', { name: 'Limpieza automática' })
  await expect(banner).toContainText(`Se limpiará el ${dm(dia ?? '')}`)

  await banner.getByRole('button', { name: 'Conservar' }).click()
  await expect(page.getByText(/este vehículo se conserva/)).toBeVisible()
  await expect(banner).toContainText('Se conserva · lo marcaste tú')
  await expect(banner.getByRole('button', { name: 'Quitar' })).toBeVisible()
  expect(await limpiezaEl(T.pronto)).toBeNull()
  // La marca es de otra tabla: la versión de la ficha no se mueve.
  const despues = await admin()
    .from('vehiculos')
    .select('actualizado_en')
    .eq('id', ids[T.pronto] ?? '')
    .single<{ actualizado_en: string }>()
  expect(despues.data?.actualizado_en).toBe(antes.data?.actualizado_en)

  // Ya no sale en el filtro.
  await irAlListado(page, '&limpieza=si')
  await expect(fila(page, T.pronto)).toHaveCount(0)

  // Y se quita: vuelve a la limpieza con la misma fecha.
  await page.goto(`/vehiculos/${ids[T.pronto]}`)
  await banner.getByRole('button', { name: 'Quitar' }).click()
  await expect(banner).toContainText(`Se limpiará el ${dm(dia ?? '')}`)
  expect(await limpiezaEl(T.pronto)).toBe(dia)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('un vehículo en la vitrina, uno manual y uno lejano no tienen aviso de «pronto»', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.goto(`/vehiculos/${ids[T.manual]}`)
  await expect(page.getByRole('heading', { name: T.manual })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Limpieza automática' })).toHaveCount(0)
  await page.goto(`/vehiculos/${ids[T.vitrina]}`)
  await expect(page.getByRole('region', { name: 'Limpieza automática' })).toHaveCount(0)
  // El conservado dice que se conserva.
  await page.goto(`/vehiculos/${ids[T.conservado]}`)
  await expect(page.getByRole('region', { name: 'Limpieza automática' })).toContainText(
    'Se conserva',
  )
  // El lejano lo dice con calma: la fecha, sin alarma y sin pasar por el filtro.
  const lejos = await limpiezaEl(T.lejos)
  await page.goto(`/vehiculos/${ids[T.lejos]}`)
  await expect(page.getByRole('region', { name: 'Limpieza automática' })).toContainText(
    `Si nadie lo usa, se limpiará el ${dm(lejos ?? '')}`,
  )
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('el job manda a la papelera lo que toca, en un lote de limpieza, y restaurarlo lo conserva', async ({
  page,
}) => {
  test.setTimeout(90_000)
  // Corre acotado a este origen y dentro de 5 días: «Pronto» ya venció; lo retenido, no.
  const ahora = new Date(Date.now() + 5 * DIA_MS).toISOString()
  const corrida = await admin().rpc('limpieza_automatica_correr', {
    p_ahora: ahora,
    p_origenes: [subasta.id],
  })
  exigir(corrida.error, 'correr la limpieza')
  const resultado = corrida.data as {
    estado: string
    corrida: string
    lote: string | null
    movidos: number
    saltados: Record<string, number>
  }
  corridas.push(resultado.corrida)
  if (resultado.lote) {
    lotes.push(resultado.lote)
  }
  expect(resultado.estado).toBe('corrida')
  expect(resultado.movidos).toBeGreaterThanOrEqual(1)
  expect(resultado.saltados['vitrina']).toBe(1)
  expect(resultado.saltados['conservar']).toBe(1)

  const estado = async (titulo: string) =>
    (
      await admin()
        .from('vehiculos')
        .select('eliminado_en, lote_papelera_id')
        .eq('id', ids[titulo] ?? '')
        .single<{ eliminado_en: string | null; lote_papelera_id: string | null }>()
    ).data
  expect((await estado(T.pronto))?.eliminado_en).not.toBeNull()
  expect((await estado(T.vitrina))?.eliminado_en).toBeNull()
  expect((await estado(T.manual))?.eliminado_en).toBeNull()
  expect((await estado(T.conservado))?.eliminado_en).toBeNull()

  // Sin sesión, ni la ficha: la papelera lo dice por su lote.
  await entrar(page, duena)
  await page.goto('/vehiculos/papelera')
  // La última noche (`limpieza_ultima`) sólo cuenta las corridas de verdad, no ésta, acotada.
  const lote = page.getByRole('region', { name: 'Lote enviado por la limpieza automática' })
  await expect(lote.getByText(/Limpieza automática del/)).toBeVisible()
  await expect(lote.getByText(T.pronto)).toBeVisible()
  await lote.getByRole('button', { name: `Restaurar ${T.pronto}` }).click()
  await expect(page.getByText(`«${T.pronto}» volvió al inventario.`)).toBeVisible()

  const restaurado = await estado(T.pronto)
  expect(restaurado?.eliminado_en).toBeNull()
  const marca = await admin()
    .from('vehiculos_conservados')
    .select('vehiculo_id')
    .eq('vehiculo_id', ids[T.pronto] ?? '')
  expect(marca.data).toHaveLength(1)
  await page.goto(`/vehiculos/${ids[T.pronto]}`)
  await expect(page.getByRole('region', { name: 'Limpieza automática' })).toContainText(
    'Se conserva',
  )
})

test('apagada, no hay filtro ni avisos; los días de gracia se editan en Empresa', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.goto('/configuracion/empresa')
  await page.getByText('Políticas', { exact: true }).click()
  await page.getByLabel('Días de gracia de la limpieza').fill('10')
  await page.getByRole('switch', { name: 'Limpieza automática de subastas' }).click()
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Ajustes de la empresa guardados')).toBeVisible()
  const guardado = await admin()
    .from('ajustes_empresa')
    .select('limpieza_automatica, limpieza_dias_gracia')
    .eq('id', 1)
    .single<{ limpieza_automatica: boolean; limpieza_dias_gracia: number }>()
  expect(guardado.data).toEqual({ limpieza_automatica: false, limpieza_dias_gracia: 10 })

  // Sin el interruptor no hay filtro ni insignias ni banner.
  await irAlListado(page)
  await expect(fila(page, T.lejos)).toBeVisible()
  await expect(page.getByText('Se limpia el')).toHaveCount(0)
  const panelApagado = await panelDeFiltros(page)
  await expect(panelApagado.getByRole('group', { name: 'Se limpiará pronto' })).toHaveCount(0)
  await cerrarPanelDeFiltros(page)
  await page.goto(`/vehiculos/${ids[T.lejos]}`)
  await expect(page.getByRole('region', { name: 'Limpieza automática' })).toHaveCount(0)
  // Y el job, apagado, no mueve nada.
  const apagada = await admin().rpc('limpieza_automatica_correr', {
    p_ahora: new Date(Date.now() + 30 * DIA_MS).toISOString(),
    p_origenes: [subasta.id],
  })
  exigir(apagada.error, 'correr la limpieza apagada')
  expect((apagada.data as { estado: string }).estado).toBe('apagada')
})
