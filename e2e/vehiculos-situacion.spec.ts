import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { PREFIJO_CLAVE_E2E, borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import { borrarVehiculosDe } from './soporte/vehiculos'

// La situación real del vehículo (docs/UX.md › «Vehículos (estados propios)» y «Logística: estados propios»): una subasta terminada en la fase de
// subasta figura «Sin resolver» en la ficha. «La ganamos» abre el mover de logística en su modo y, al mover, la anota ganada; «No la ganamos» la deja
// «No ganada», fuera del inventario y de la cadena, y «Deshacer» la devuelve. Permisos, conflictos y carreras tienen su prueba SQL
// (`supabase/tests/areas/situacion/`); acá, que la pantalla los lleva a cabo. Terreno propio por SQL de servicio, borrado al empezar y al terminar.
test.describe.configure({ mode: 'serial' })

const DIA = 86_400_000

type Terreno = {
  origen: string
  subasta: string
  comprado: string
  ganada: { id: string; titulo: string }
  perdida: { id: string; titulo: string }
}

let proyecto = ''
let correo = ''
let terreno: Terreno

const claveDe = (p: string) => `${PREFIJO_CLAVE_E2E}situacion_${p}`

function exigir(error: { message: string } | null, que: string): void {
  if (error) throw new Error(`No se pudo ${que}: ${error.message}`)
}

async function borrarTerreno(p: string): Promise<void> {
  await borrarVehiculosDe([claveDe(p)])
  await borrarOrigenes([claveDe(p)])
}

// Un origen de subasta con «Subasta» (inicial, la subasta, con columna en la cadena) → «Comprado», y dos vehículos con la subasta terminada en
// «Subasta». No son importados: la limpieza no los mira.
async function sembrar(p: string): Promise<Terreno> {
  const origen = await crearOrigenDePrueba(`E2E Situación ${p}`, `situacion_${p}`, {
    tipo: 'subasta',
    plataformas: ['copart'],
  })
  const cliente = admin()
  const flujo = await cliente
    .from('flujos')
    .select('id')
    .eq('origen_id', origen.id)
    .single<{ id: string }>()
  exigir(flujo.error, 'leer el flujo')
  const fases = await cliente
    .from('fases')
    .insert([
      {
        flujo_id: flujo.data?.id,
        nombre: 'Subasta',
        orden: 1,
        es_inicial: true,
        es_subasta: true,
        es_logistica: true,
      },
      {
        flujo_id: flujo.data?.id,
        nombre: 'Comprado',
        orden: 2,
        es_inicial: false,
        es_subasta: false,
        es_logistica: true,
      },
    ])
    .select('id, nombre')
    .returns<{ id: string; nombre: string }[]>()
  exigir(fases.error, 'crear las fases')
  const fase = (nombre: string) => fases.data?.find((f) => f.nombre === nombre)?.id ?? ''
  exigir(
    (
      await cliente.from('fases_transiciones').insert({
        flujo_id: flujo.data?.id,
        de_fase_id: fase('Subasta'),
        a_fase_id: fase('Comprado'),
      })
    ).error,
    'crear la salida',
  )
  const titulos = { ganada: `E2E La ganamos ${p}`, perdida: `E2E No la ganamos ${p}` }
  const hace = new Date(Date.now() - 2 * DIA).toISOString()
  const vehiculos = await cliente
    .from('vehiculos')
    .insert(
      Object.values(titulos).map((titulo) => ({
        origen_id: origen.id,
        titulo,
        fase_id: fase('Subasta'),
        fase_desde: hace,
        estado_subasta: 'terminada',
        subasta_en: hace,
      })),
    )
    .select('id, titulo, situacion')
    .returns<{ id: string; titulo: string; situacion: string }[]>()
  exigir(vehiculos.error, 'cargar los vehículos')
  if (vehiculos.data?.some((v) => v.situacion !== 'sin_resolver')) {
    throw new Error('El terreno no quedó «Sin resolver».')
  }
  const id = (titulo: string) => vehiculos.data?.find((v) => v.titulo === titulo)?.id ?? ''
  return {
    origen: origen.id,
    subasta: fase('Subasta'),
    comprado: fase('Comprado'),
    ganada: { id: id(titulos.ganada), titulo: titulos.ganada },
    perdida: { id: id(titulos.perdida), titulo: titulos.perdida },
  }
}

async function filaDe(id: string) {
  const { data, error } = await admin()
    .from('vehiculos')
    .select('situacion, subasta_resultado, fase_id')
    .eq('id', id)
    .single<{ situacion: string; subasta_resultado: string | null; fase_id: string | null }>()
  exigir(error, 'leer el vehículo')
  return data
}

async function cuantas(tabla: 'historial_fases' | 'actividad', filtro: Record<string, string>) {
  const { data, error } = await admin().from(tabla).select('id').match(filtro).limit(10)
  exigir(error, `leer ${tabla}`)
  return data?.length ?? 0
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  correo = correoDePrueba(`duena-situacion-${proyecto}`)
  await borrarTerreno(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({ email: correo, contrasena: CONTRASENA, nombre: 'Dalia Situación' })
  terreno = await sembrar(proyecto)
})

test.afterAll(async () => {
  await borrarTerreno(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E situación · «Sin resolver» → «La ganamos» la mueve a la fase siguiente y lo anota', async ({
  page,
}) => {
  const { ganada } = terreno
  await entrar(page, correo, { fresco: true })
  await page.goto(`/vehiculos/${ganada.id}`)
  await expect(page.locator('[data-situacion="sin_resolver"]').first()).toHaveText('Sin resolver')
  const aviso = page.locator('[data-aviso="situacion"]')
  await expect(aviso).toContainText('La subasta terminó y sigue en «Subasta». ¿La ganamos?')
  await aviso.getByRole('link', { name: 'La ganamos' }).click()
  await expect(page).toHaveURL(new RegExp(`/logistica/vehiculo/${ganada.id}\\?ganada=si`))
  await expect(page.locator('[data-modo="ganada"]')).toHaveText(
    'La ganamos: elige a qué fase pasa. Se anota como ganada al moverla.',
  )
  // «Comprado» nace abierto (el primer destino que no es la subasta), con su vista previa.
  const mover = page.getByRole('button', { name: 'Mover a «Comprado»' })
  await expect(mover).toBeEnabled()
  await mover.click()
  await expect(page.getByText(`La ganamos: ${ganada.titulo} pasó a «Comprado».`)).toBeVisible()
  await expect(page).not.toHaveURL(/ganada=si/)
  await expect(page.locator('[data-modo="ganada"]')).toHaveCount(0)
  await expect.poll(async () => (await filaDe(ganada.id))?.subasta_resultado).toBe('ganada')
  expect(await filaDe(ganada.id)).toEqual({
    situacion: 'fase',
    subasta_resultado: 'ganada',
    fase_id: terreno.comprado,
  })
  expect(await cuantas('historial_fases', { vehiculo_id: ganada.id })).toBe(1)
  expect(
    await cuantas('actividad', { registro_id: ganada.id, accion: 'vehiculo.subasta_resuelta' }),
  ).toBe(1)
})

test('E2E situación · «Sin resolver» → «No la ganamos» deja de contar y «Deshacer» la devuelve', async ({
  page,
}) => {
  const { perdida, ganada } = terreno
  await entrar(page, correo)
  await page.goto(`/vehiculos/${perdida.id}`)
  const aviso = page.locator('[data-aviso="situacion"]')
  await aviso.getByRole('button', { name: 'No la ganamos' }).click()
  await expect(page.locator('[data-situacion="no_ganada"]').first()).toHaveText('No ganada')
  await expect(aviso).toContainText('Ya no cuenta en logística ni en Inicio.')
  await expect.poll(async () => (await filaDe(perdida.id))?.situacion).toBe('no_ganada')

  // El inventario por defecto ya no la lista; la otra, sí.
  await page.goto(`/vehiculos?origen=${terreno.origen}`)
  await expect(page.getByText(ganada.titulo).first()).toBeVisible()
  await expect(page.getByText(perdida.titulo)).toHaveCount(0)

  // La cadena tampoco: la columna «Subasta» queda sin ella (en el celular se ve una columna a la vez: la primera es «Subasta»).
  await page.goto(`/logistica?origen=${terreno.origen}`)
  await expect(page.getByText('Comprado').first()).toBeVisible()
  await expect(page.getByText('Sin vehículos en esta fase.').first()).toBeVisible()
  await expect(page.locator(`[data-tarjeta="${perdida.id}"]`)).toHaveCount(0)

  // «Deshacer» desde la ficha la devuelve a «Sin resolver».
  await page.goto(`/vehiculos/${perdida.id}`)
  await expect(aviso).toContainText('la marcó Dalia Situación')
  await aviso.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.locator('[data-situacion="sin_resolver"]').first()).toHaveText('Sin resolver')
  await expect.poll(async () => (await filaDe(perdida.id))?.subasta_resultado ?? null).toBeNull()
})
