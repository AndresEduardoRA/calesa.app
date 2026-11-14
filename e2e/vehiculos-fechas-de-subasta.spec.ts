import { expect, test } from './soporte/prueba'
import { desmontarSubasta, prepararSubasta, type EstadoDeApibara } from './soporte/apibara'
import { admin } from './soporte/base'
import { entrar } from './soporte/inventario'

// Editar las fechas de la subasta (A4b) desde el bloque de la subasta de la ficha: «Editar fechas» abre `?panel=fechas-de-subasta`, la
// hora se escribe en la zona de quien edita (la de su perfil, acá Nueva York) y se guarda el instante en UTC. Un cierre antes del inicio
// se dice junto al campo. Sin llamadas a apibara.
test.describe.configure({ mode: 'serial' })

let duena = ''
let subasta = { id: '', nombre: '' }
let apibaraAntes: EstadoDeApibara
let vehiculoId = ''

async function exigir<T>(
  pedido: PromiseLike<{ data: T | null; error: { message: string } | null }>,
): Promise<T> {
  const { data, error } = await pedido
  if (error) throw new Error(error.message)
  if (data === null) throw new Error('La base no devolvió nada.')
  return data
}

test.beforeAll(async ({}, info) => {
  ;({ duena, subasta, apibaraAntes } = await prepararSubasta(info.project.name))
  const fila = await exigir(
    admin()
      .from('vehiculos')
      .insert({ origen_id: subasta.id, titulo: 'Fechas A Mano' })
      .select('id')
      .single<{ id: string }>(),
  )
  vehiculoId = fila.id
  const persona = await exigir(
    admin().from('perfiles').select('id').eq('email', duena).single<{ id: string }>(),
  )
  const { error } = await admin()
    .from('preferencias_usuario')
    .upsert({ usuario_id: persona.id, clave: 'zona_horaria', valor: 'America/New_York' })
  if (error) throw new Error(error.message)
})

test.afterAll(async () => {
  await desmontarSubasta(apibaraAntes)
})

async function fechasGuardadas() {
  return exigir(
    admin()
      .from('vehiculos')
      .select('subasta_en, subasta_fin_en')
      .eq('id', vehiculoId)
      .single<{ subasta_en: string | null; subasta_fin_en: string | null }>(),
  )
}

test('las fechas se escriben en la zona de quien edita y se guardan en UTC', async ({ page }) => {
  await entrar(page, duena)
  await page.goto(`/vehiculos/${vehiculoId}`)
  const bloque = page.getByRole('region', { name: 'Subasta' })
  await expect(bloque).toContainText('Sin fecha')
  await bloque.getByRole('button', { name: 'Editar fechas' }).click()
  await expect(page).toHaveURL(/[?&]panel=fechas-de-subasta/)
  const modal = page.getByRole('dialog', { name: 'Fechas de la subasta' })
  await expect(modal).toContainText('Se escribe en hora de America/New_York')

  // Un cierre antes del inicio se dice junto al campo y no se guarda.
  await modal.getByLabel('Fecha de la subasta').fill('2026-12-01T10:30')
  await modal.getByLabel('Cierre (subasta temporizada)').fill('2026-12-01T09:00')
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal).toContainText('El cierre no puede ser antes del inicio.')
  expect((await fechasGuardadas()).subasta_en).toBeNull()

  await modal.getByLabel('Cierre (subasta temporizada)').fill('')
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Fechas de la subasta guardadas.')).toBeVisible()
  await expect(modal).toBeHidden()
  // 10:30 en Nueva York el 1 de diciembre (EST, UTC−5) son las 15:30 en UTC.
  const guardadas = await fechasGuardadas()
  expect(new Date(guardadas.subasta_en ?? '').toISOString()).toBe('2026-12-01T15:30:00.000Z')
  expect(guardadas.subasta_fin_en).toBeNull()
  await expect(bloque).not.toContainText('Sin fecha')

  // Al volver a abrir, lo guardado se ve en la misma zona.
  await bloque.getByRole('button', { name: 'Editar fechas' }).click()
  await expect(modal.getByLabel('Fecha de la subasta')).toHaveValue('2026-12-01T10:30')
})
