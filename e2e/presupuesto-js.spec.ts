import { entrar, limpiarAlta, prepararAlta, type PersonasDelAlta } from './soporte/alta'
import { enKB, medirJsEnFrio } from './soporte/js-en-frio'
import { PRESUPUESTO_DE_JS_EN_KB } from './soporte/presupuestos'
import { expect, test } from './soporte/prueba'

// El JS que paga quien llega por primera vez a una pantalla (`e2e/soporte/js-en-frio.ts`), contra el build.
// Falla por encima del presupuesto de la ruta (`e2e/soporte/presupuestos.ts`): el shell (el layout de
// `(app)`) importa sólo lo que dibuja el marco, y lo que no se ve al abrir (la ficha, un modal) llega con
// `import()` (`.claude/rules/escala.md`).
test.describe.configure({ mode: 'serial' })

let personas: PersonasDelAlta
let restaurar = async () => {}

test.beforeAll(async ({}, info) => {
  test.skip(info.project.name !== 'escritorio', 'Sólo escritorio: el JS no depende del viewport.')
  const terreno = await prepararAlta(`${info.project.name}-js`)
  personas = terreno.personas
  restaurar = terreno.restaurarCatalogos
})

test.afterAll(async () => {
  await limpiarAlta(restaurar)
})

for (const [ruta, presupuesto] of Object.entries(PRESUPUESTO_DE_JS_EN_KB)) {
  test(`${ruta}: el JS en frío cabe en ${String(presupuesto)} KB`, async ({ page }, info) => {
    await entrar(page, personas.duena)
    const { bytes, chunks } = await medirJsEnFrio(page.context(), ruta)
    info.annotations.push({
      type: 'JS en frío',
      description: `${ruta}: ${String(enKB(bytes))} KB con gzip en ${String(chunks)} chunks (presupuesto ${String(presupuesto)})`,
    })
    expect(enKB(bytes), `${ruta}: ${String(enKB(bytes))} KB de JS en frío`).toBeLessThanOrEqual(
      presupuesto,
    )
  })
}

test('el shell no trae la ficha ni el listado de leads a `/perfil`', async ({ page }) => {
  await entrar(page, personas.duena)
  const perfil = await medirJsEnFrio(page.context(), '/perfil')
  const leads = await medirJsEnFrio(page.context(), '/leads')
  // Con el shell cargando por los barriles de los módulos, `/perfil` pesaba lo mismo que `/leads`.
  expect(enKB(leads.bytes) - enKB(perfil.bytes)).toBeGreaterThan(50)
})
