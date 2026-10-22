import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { exigir, idDe } from './soporte/leads'
import {
  PROPIO_BERTA,
  fila,
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { capturar, sinScrollHorizontal } from './soporte/recorrido'
import { sql } from './soporte/sql'

// 4.03 (5a-9): el texto de un campo público no tiene índice; para quien ve «todos» (la dueña) la base lo recorre por el orden del listado como mucho 2,5 ventanas (10.000 leads) y lo
// dice. Acá la ventana se achica de 4.000 a 20 (el tope son 50 leads) para probarlo con pocos: 60 leads recientes de otro color, y uno viejo —«Perdido»— que sí coincide. El tope no
// es «nada coincide»: dice cuántos leads miró y hasta qué fecha, y «Seguir buscando» sigue desde ahí hasta dar con él. Quien ve sólo lo suyo (Berta) no tiene tope.
// Capturas: `E2E_CAPTURAS=e2e-capturas/4-03c/{antes,despues}`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
let funcionOriginal = ''
const PERDIDO = 'Lead Perdido'
const RELLENOS = 60

test.beforeAll(async ({}, info) => {
  test.setTimeout(120_000)
  t = await prepararListado(info.project.name)
  // La ventana de la base, achicada para esta prueba (y restituida al terminar).
  funcionOriginal = sql(
    `select pg_get_functiondef('public._leads_candidatos_recorrido()'::regprocedure)`,
  )
  sql(
    `create or replace function public._leads_candidatos_recorrido() returns integer language sql immutable parallel safe set search_path = '' as $f$ select 20 $f$`,
  )
  const duena = await idDe(t.personas.duena)
  const prefijo = info.project.name === 'movil' ? '82' : '81'
  const { error } = await admin()
    .from('leads')
    .insert([
      ...Array.from({ length: RELLENOS }, (_, i) => ({
        nombre: `E2E Relleno ${String(i + 1)} ${info.project.name}`,
        telefono_principal: `5917${prefijo}${String(i).padStart(5, '0')}`,
        creado_por: duena,
        creado_en: new Date(Date.now() + (i + 1) * 60_000).toISOString(),
        atributos: { e2e_color: 'gris' },
      })),
      {
        nombre: `E2E ${PERDIDO}`,
        telefono_principal: `5917${prefijo}99999`,
        creado_por: duena,
        creado_en: new Date(Date.now() - 2 * 365 * 24 * 3_600_000).toISOString(),
        atributos: { e2e_color: 'violeta' },
      },
    ])
  exigir(error, 'sembrar los leads del tope')
})

test.afterAll(async () => {
  sql(funcionOriginal)
  const { error } = await admin().from('leads').delete().like('nombre', 'E2E Relleno %')
  exigir(error, 'borrar los rellenos')
  const { error: error2 } = await admin().from('leads').delete().eq('nombre', `E2E ${PERDIDO}`)
  exigir(error2, 'borrar el lead perdido')
  await limpiarListado(t)
})

test('la dueña, «todos»: el tope dice «Nada coincide hasta ahora», y «Seguir buscando» llega al lead viejo', async ({
  page,
}, info) => {
  await entrar(page, t.personas.duena)
  await irALeads(page, '?alcance=todos&a.e2e_color=vio')
  // Los primeros 50 leads son los rellenos, que no son violeta: no es «nada coincide», es «nada hasta ahora».
  await expect(page.getByText('Nada coincide hasta ahora')).toBeVisible()
  await expect(page.getByText('Nada coincide con los filtros')).toHaveCount(0)
  await expect(page.getByText(/Se buscó en 50 leads, hasta el /)).toBeVisible()
  await capturar(page, info, 'tope-nada-hasta-ahora')
  await sinScrollHorizontal(page)
  // Seguir: cada tramo mira otros 50 y lo dice; en alguno aparece el lead viejo.
  const perdido = fila(page, PERDIDO)
  for (let tramo = 0; tramo < 8 && !(await perdido.isVisible()); tramo++) {
    await page.getByRole('link', { name: 'Seguir buscando' }).click()
    await expect(page).toHaveURL(/cursor=/)
    await expect(perdido.or(page.getByText(/Se buscó en \d+ leads, hasta el /))).toBeVisible()
  }
  await expect(perdido).toBeVisible()
  await capturar(page, info, 'tope-lead-encontrado')
  await sinScrollHorizontal(page)
})

test('con un valor que no llega al tope no hay aviso, y quien ve sólo lo suyo no tiene tope', async ({
  page,
}) => {
  await entrar(page, t.personas.berta)
  await irALeads(page, '?a.e2e_color=roj')
  await expect(fila(page, PROPIO_BERTA)).toBeVisible()
  await expect(page.getByText(/Se buscó en \d+ leads/)).toHaveCount(0)
  // Y lo que Berta no tiene lo dice como siempre.
  await irALeads(page, '?a.e2e_color=vio')
  await expect(page.getByText('Nada coincide con los filtros')).toBeVisible()
  await expect(page.getByText('Nada coincide hasta ahora')).toHaveCount(0)
})
