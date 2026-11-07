import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { sembrarBorrador } from './soporte/formula-versiones'
import { literal, sql } from './soporte/sql'

// Publicar y descartar con la hora del borrador (4.21-3b-1, C9; cierra 4-8 de punta a punta): la pestaña manda el `actualizado_en` del borrador que leyó, y si otra
// persona lo guardó después, la base da su PT409 («El borrador cambió después de que lo abriste…») con «Recargar»; tras recargar, se publica o se descarta el de ahora.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let paraPublicar = { id: '', nombre: '' }
let paraDescartar = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-esperada-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Esme Espera' })
  paraPublicar = await crearOrigenDeCotizar(proyecto, 'espub', true)
  sembrarBorrador(paraPublicar.id, { autor: duena, sobre: 'publicada', conDiseno: true })
  paraDescartar = await crearOrigenDeCotizar(proyecto, 'esdesc', true)
  sembrarBorrador(paraDescartar.id, { autor: duena, sobre: 'publicada', conDiseno: true })
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

// Otra persona guarda el borrador: cualquier `update` mueve su hora (`trg_actualizado_en`).
function guardaOtraPersona(origenId: string): void {
  sql(`update public.formulas set nota = 'La guardó otra persona'
        where origen_id = ${literal(origenId)}::uuid and estado = 'borrador'`)
}

async function abrirFormula(page: Page, origenId: string) {
  await page.goto(`/configuracion/cotizacion?seccion=formula&origen=${origenId}`)
  await expect(page.getByRole('heading', { name: 'Fórmula', level: 2 })).toBeVisible()
}

test('G6: si otra persona guardó el borrador, publicar da su conflicto con «Recargar» y, tras recargar, publica', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirFormula(page, paraPublicar.id)
  await page.getByRole('button', { name: 'Publicar…' }).click()
  const modal = page.getByRole('dialog', { name: 'Publicar el borrador' })
  await modal.getByLabel('Nota').fill('Con la hora')
  guardaOtraPersona(paraPublicar.id)
  await modal.getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(modal.getByText(/^El borrador cambió después de que lo abriste/)).toBeVisible()
  await modal.getByRole('button', { name: 'Recargar' }).click()
  await expect(modal.getByText(/^El borrador cambió después de que lo abriste/)).toBeHidden()
  await expect(modal.getByLabel('Nota')).toHaveValue('Con la hora')
  await modal.getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(modal).toBeHidden()
  await expect(page.getByRole('region', { name: 'Publicada' })).toContainText(
    'Publicada: versión 2',
  )
})

test('G6: si otra persona guardó el borrador, descartar da su conflicto con «Recargar» y, tras recargar, descarta', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirFormula(page, paraDescartar.id)
  await page.getByRole('button', { name: 'Descartar…', exact: true }).click()
  const dialogo = page.getByRole('dialog', { name: 'Descartar el borrador de Esme Espera' })
  guardaOtraPersona(paraDescartar.id)
  await dialogo.getByRole('button', { name: 'Descartar borrador' }).click()
  await expect(dialogo).toContainText('El borrador cambió después de que lo abriste')
  await dialogo.getByRole('button', { name: 'Recargar' }).click()
  await expect(dialogo).not.toContainText('El borrador cambió después de que lo abriste')
  await dialogo.getByRole('button', { name: 'Descartar borrador' }).click()
  await expect(dialogo).toBeHidden()
  await expect(page.getByRole('region', { name: 'Borrador' })).toHaveCount(0)
})
