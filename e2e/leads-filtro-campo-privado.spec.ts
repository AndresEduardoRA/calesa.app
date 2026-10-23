import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import {
  delLead,
  fila,
  irALeads,
  limpiarListado,
  prepararListado,
  sinResultados,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { ponerMarcaDe } from './soporte/leads-marcas'

// 4.03 (5a-34): el texto de un campo privado (la cédula) lo cumplen los candidatos, sobre la cartera de quien filtra: ni lo ajeno aparece ni se cuenta. El listado y el aviso de los
// tachados ocultos dicen lo mismo que antes —el conteo de los ocultos ya no paga `atributos_lead()` por lead, y su resultado no cambia—. Los dos casos pasan también contra HEAD: cuidan
// el contrato (cada uno se demuestra con una mutación de `conteo-de-leads.ts`).
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const leadDeBerta = (corto: string, atributos: Record<string, unknown>) =>
  nuevoLead({
    corto,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
    atributos,
  })

test('Berta filtra por un trozo de su cédula privada y no encuentra la de otra persona', async ({
  page,
}, info) => {
  const propio = `Priv Propio ${info.project.name}`
  await leadDeBerta(propio, { e2e_ci: `CI-BERTA-${info.project.name}-4455` })
  await entrar(page, t.personas.berta)
  await irALeads(page, `?a.e2e_ci=${encodeURIComponent(`BERTA-${info.project.name}`)}`)
  await expect(fila(page, propio)).toBeVisible()
  // La cédula de Carlos existe, pero no es de la cartera de Berta: contesta lo mismo que un valor que nadie tiene.
  await irALeads(page, '?a.e2e_ci=CARLOS-77')
  await expect(sinResultados(page)).toBeVisible()
})

test('los tachados ocultos que cumplen un texto privado se cuentan y «Mostrarlos» los trae', async ({
  page,
}, info) => {
  const tachado = `Priv Tachado ${info.project.name}`
  const visible = `Priv Visible ${info.project.name}`
  const cedula = `CI-OCULTA-${info.project.name}`
  const lead = await leadDeBerta(tachado, { e2e_ci: `${cedula}-1` })
  await leadDeBerta(visible, { e2e_ci: `${cedula}-2` })
  await ponerMarcaDe(t.personas.berta, lead.id, 'tachado')
  await entrar(page, t.personas.berta)
  await irALeads(page, `?a.e2e_ci=${encodeURIComponent(cedula)}`)
  await expect(fila(page, visible)).toBeVisible()
  await expect(fila(page, tachado)).toHaveCount(0)
  const aviso = page.getByRole('status').filter({ hasText: /oculto porque lo tachaste/ })
  await expect(aviso).toHaveText(/1 lead que coincide está oculto porque lo tachaste\./)
  await aviso.getByRole('button', { name: 'Mostrarlos' }).click()
  await expect(page).toHaveURL(/tachados=incluir/)
  await expect(delLead(page, tachado).getByText('Tachado', { exact: true })).toBeVisible()
  await expect(fila(page, visible)).toBeVisible()
})
