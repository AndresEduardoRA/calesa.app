import { entrar, limpiarAlta, prepararAlta, type PersonasDelAlta } from './soporte/alta'
import { enKB, medirJsEnFrio } from './soporte/js-en-frio'
import {
  PRESUPUESTO_DEL_DOCUMENTO_DE_PERFIL_EN_KB,
  PRESUPUESTO_DE_JS_EN_KB,
} from './soporte/presupuestos'
import { expect, test } from './soporte/prueba'
import { sql } from './soporte/sql'

// El JS que paga quien llega por primera vez a una pantalla (`e2e/soporte/js-en-frio.ts`), contra el build.
// Falla por encima del presupuesto de la ruta (`e2e/soporte/presupuestos.ts`): el shell (el layout de
// `(app)`) importa sólo lo que dibuja el marco, y lo que no se ve al abrir (la ficha, un modal) llega con
// `import()` (`.claude/rules/escala.md`).
test.describe.configure({ mode: 'serial' })

let personas: PersonasDelAlta
let restaurar = async () => {}

// La hoja de cotizar se mide con la subasta de la semilla: sin `?origen=` abriría el primero, que puede no tener fórmula y pesar menos.
const destinoDe = (ruta: string): string =>
  ruta === '/cotizaciones/nuevo'
    ? `${ruta}?origen=${sql("select id from public.origenes where clave = 'subasta_usa'")}`
    : ruta

test.beforeAll(async ({}, info) => {
  const terreno = await prepararAlta(`${info.project.name}-js`)
  personas = terreno.personas
  restaurar = terreno.restaurarCatalogos
})

test.afterAll(async () => {
  await limpiarAlta(restaurar)
})

for (const [ruta, presupuesto] of Object.entries(PRESUPUESTO_DE_JS_EN_KB)) {
  test(`${ruta}: el JS en frío cabe en ${String(presupuesto)} KB`, async ({ page }, info) => {
    test.skip(info.project.name !== 'escritorio', 'Sólo escritorio: el JS no depende del viewport.')
    await entrar(page, personas.duena)
    const { bytes, chunks } = await medirJsEnFrio(page.context(), destinoDe(ruta))
    info.annotations.push({
      type: 'JS en frío',
      description: `${ruta}: ${String(enKB(bytes))} KB con gzip en ${String(chunks)} chunks (presupuesto ${String(presupuesto)})`,
    })
    console.warn(
      `[js] ${ruta}: ${String(enKB(bytes))} KB con gzip en ${String(chunks)} chunks (presupuesto ${String(presupuesto)})`,
    )
    expect(enKB(bytes), `${ruta}: ${String(enKB(bytes))} KB de JS en frío`).toBeLessThanOrEqual(
      presupuesto,
    )
  })
}

test('el shell no trae la ficha ni el listado de leads a `/perfil`', async ({ page }, info) => {
  test.skip(info.project.name !== 'escritorio', 'Sólo escritorio: el JS no depende del viewport.')
  await entrar(page, personas.duena)
  const perfil = await medirJsEnFrio(page.context(), '/perfil')
  const leads = await medirJsEnFrio(page.context(), '/leads')
  // Con el shell cargando por los barriles de los módulos, `/perfil` pesaba lo mismo que `/leads`.
  expect(enKB(leads.bytes) - enKB(perfil.bytes)).toBeGreaterThan(50)
})

// 5b-3: el documento de cada pantalla no lleva los catálogos del alta de lead. El shell los mandaba (orígenes, tipos de lead, tipos de
// seguimiento y el layout de campos, a un Client Component) en toda pantalla, también `/perfil`: con 100 orígenes y 100 tipos eran
// ~26 KB de más en cada visita, se abriera o no «Nuevo lead». Ahora el drawer los lee al primer clic.
const PREFIJO_DEL_CATALOGO = 'e2e_cat_perfil_'

test('el documento de `/perfil` pesa lo mismo con 100 orígenes, 100 tipos de lead y 100 de seguimiento, con sus iconos, que con la semilla', async ({
  page,
}, info) => {
  await entrar(page, personas.duena)
  const documento = async () => (await (await page.goto('/perfil'))?.body())?.length ?? 0
  const antes = await documento()
  try {
    sql(`
      insert into public.origenes_lead (clave, nombre, icono, orden)
        select '${PREFIJO_DEL_CATALOGO}' || n, 'E2E catálogo perfil origen ' || n, 'casa', 1000 + n
        from generate_series(1, 100 - (select count(*) from public.origenes_lead)) n;
      insert into public.tipos_lead (clave, nombre, clase, icono, orden)
        select '${PREFIJO_DEL_CATALOGO}' || n, 'E2E catálogo perfil tipo ' || n, 'prospecto', 'persona', 1000 + n
        from generate_series(1, 100 - (select count(*) from public.tipos_lead)) n;
      insert into public.tipos_seguimiento (clave, nombre, icono, orden)
        select '${PREFIJO_DEL_CATALOGO}' || n, 'E2E catálogo perfil seguimiento ' || n, 'nota', 1000 + n
        from generate_series(1, 100 - (select count(*) from public.tipos_seguimiento)) n;
    `)
    const despues = await documento()
    const resumen = `/perfil pesa ${String(antes)} bytes con la semilla y ${String(despues)} con 100 orígenes, 100 tipos de lead y 100 de seguimiento (${String(despues - antes)} de diferencia)`
    console.warn(`[perfil] ${info.project.name}: ${resumen}`)
    info.annotations.push({ type: 'documento de /perfil', description: resumen })
    expect(Math.abs(despues - antes), resumen).toBeLessThanOrEqual(1024)
    expect(despues / 1024, resumen).toBeLessThanOrEqual(PRESUPUESTO_DEL_DOCUMENTO_DE_PERFIL_EN_KB)
  } finally {
    sql(`
      delete from public.origenes_lead where clave like '${PREFIJO_DEL_CATALOGO}%';
      delete from public.tipos_lead where clave like '${PREFIJO_DEL_CATALOGO}%';
      delete from public.tipos_seguimiento where clave like '${PREFIJO_DEL_CATALOGO}%';
    `)
  }
})
