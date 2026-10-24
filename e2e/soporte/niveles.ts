// Lo que los e2e de Configuración › Cotización › Niveles y de la matriz de Roles preparan y miran en la base del Supabase LOCAL. Todo nivel que
// crea un e2e lleva este prefijo en su nombre (y `e2e_4_09` en su clave): es lo único que la limpieza borra, junto con sus dos permisos y los
// borradores de fórmula que lo nombren. El tope de niveles es de toda la base (10, con «todos» y los retirados): `llenarNivelesHasta()` cuenta lo
// que ya hay, que otros specs o `db:carreras` pueden haber dejado.
import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { sql } from './sql'

export const PREFIJO_DE_NIVEL_E2E = 'E2E 4.09'
const PREFIJO_DE_CLAVE = 'e2e_4_09'

export type NivelEnLaBase = {
  id: string
  clave: string
  nombre: string
  retirado_en: string | null
  actualizado_en: string
}

const comillas = (texto: string) => texto.replaceAll("'", "''")

export function nivelesEnLaBase(): NivelEnLaBase[] {
  const salida = sql(
    `select coalesce(jsonb_agg(to_jsonb(n) order by n.nombre), '[]'::jsonb)
       from (select id, clave, nombre, retirado_en, actualizado_en from public.cotizaciones_niveles) n`,
  )
  return JSON.parse(salida) as NivelEnLaBase[]
}

export function nivelEnLaBase(nombre: string): NivelEnLaBase | undefined {
  return nivelesEnLaBase().find((nivel) => nivel.nombre === nombre)
}

export function permisosDeNivel(clave: string): string[] {
  const salida = sql(
    `select coalesce(jsonb_agg(clave order by clave), '[]'::jsonb) from public.permisos where nivel_clave = '${comillas(clave)}'`,
  )
  return JSON.parse(salida) as string[]
}

// Cuántos roles tienen concedido ese permiso (el dueño lo recibe al nacer el nivel).
export function concesionesDelPermiso(permiso: string): number {
  return Number(
    sql(`select count(*) from public.roles_permisos where permiso_clave = '${comillas(permiso)}'`),
  )
}

let secuencia = 0

// Un nivel como lo deja `nivel_crear()` (el nivel, sus dos permisos y la concesión al dueño en una sola sentencia: el trigger diferido los exige al
// cerrar), sin pasar por la pantalla. `retirado`: ya retirado.
export function sembrarNivel(
  nombre: string,
  { retirado = false }: { retirado?: boolean } = {},
): NivelEnLaBase {
  secuencia += 1
  const clave =
    `${PREFIJO_DE_CLAVE}_${Date.now().toString(36).slice(-5)}${String(secuencia)}`.slice(0, 30)
  sql(
    `with n as (insert into public.cotizaciones_niveles (clave, nombre, retirado_en)
                values ('${clave}', '${comillas(nombre)}', ${retirado ? 'now()' : 'null'}) returning clave, nombre)
     select public._nivel_permisos_crear(n.clave, n.nombre, true) from n`,
  )
  const sembrado = nivelEnLaBase(nombre)
  if (!sembrado) {
    throw new Error(`No quedó el nivel ${nombre}`)
  }
  return sembrado
}

// Hasta que haya `total` niveles en la base (rellena con los de prueba, vivos, sin repetir los que ya puso).
export function llenarNivelesHasta(total: number): void {
  const hoy = nivelesEnLaBase()
  const rellenos = hoy.filter((nivel) =>
    nivel.nombre.startsWith(`${PREFIJO_DE_NIVEL_E2E} relleno`),
  ).length
  for (let n = 0; n < Math.max(0, total - hoy.length); n += 1) {
    sembrarNivel(`${PREFIJO_DE_NIVEL_E2E} relleno ${String(rellenos + n + 1).padStart(2, '0')}`)
  }
}

// El mismo efecto que un diseño que nombra el nivel: un borrador de la fórmula de «oficina» con una sección (dos celdas) de ese nivel.
export function ponerNivelEnUso(clave: string): void {
  sql(
    `delete from public.formulas where estado = 'borrador' and origen_id = (select id from public.origenes where clave = 'oficina');
     insert into public.formulas (origen_id, estado, definicion, params, diseno)
     select f.origen_id, 'borrador', f.definicion, f.params,
            jsonb_set(jsonb_set(f.diseno, '{secciones,0,nivel_ver}', to_jsonb('${comillas(clave)}'::text)),
                      '{secciones,0,nivel_editar}', to_jsonb('${comillas(clave)}'::text))
       from public.formulas f join public.origenes o on o.id = f.origen_id
      where o.clave = 'oficina' and f.estado = 'publicada'`,
  )
}

// Quita lo que creó un e2e: los borradores que nombran un nivel de prueba, los permisos de esos niveles (y con ellos las concesiones de los roles)
// y los niveles, en una sola transacción (el trigger diferido exige que un nivel no quede sin sus permisos). Deja «costos» como lo siembra la base.
export function borrarNivelesDePrueba(): void {
  sql(
    `begin;
     delete from public.formulas f where f.estado = 'borrador'
        and exists (select 1 from jsonb_array_elements_text(public._niveles_del_diseno(f.diseno)) x where x like '${PREFIJO_DE_CLAVE}%');
     delete from public.permisos where nivel_clave like '${PREFIJO_DE_CLAVE}%';
     delete from public.cotizaciones_niveles where clave like '${PREFIJO_DE_CLAVE}%';
     update public.cotizaciones_niveles set retirado_en = null where clave = 'costos' and retirado_en is not null;
     commit;`,
  )
}

// --- La pantalla --------------------------------------------------------------------------------------

export async function abrirNiveles(page: Page): Promise<void> {
  await page.goto('/configuracion/cotizacion?seccion=niveles')
  await expect(page.getByRole('heading', { name: 'Niveles de acceso', level: 2 })).toBeVisible()
}

// La fila (la `<tr>` de la tabla o el `<li>` de la tarjeta del celular, según el ancho) que dice ese nombre, también la del nivel fijo, que no se abre.
export const filaDeNivel = (page: Page, nombre: string): Locator =>
  page.locator('tr, li').filter({ has: page.getByText(nombre, { exact: true }) })

// Lo de la lista (el «⋯», sus líneas) es común a las pestañas de Configuración que lo dibujan: `soporte/lista-de-catalogo.ts`.
export { cerrarMenu, elegirDelMenu, lineaDelMenu, masAccionesDe, menuDe } from './lista-de-catalogo'

const seccion = (page: Page): Locator =>
  page.locator('section[aria-labelledby="titulo-de-niveles"]')

// Los nombres de las filas que se abren (las que se pueden renombrar), en el orden en que se ven.
export async function nombresDeNiveles(page: Page): Promise<string[]> {
  const botones = await seccion(page)
    .getByRole('button', { name: /^Abrir / })
    .all()
  const nombres: string[] = []
  for (const boton of botones) {
    nombres.push(((await boton.getAttribute('aria-label')) ?? '').replace(/^Abrir /, ''))
  }
  return nombres
}

export const nombresAbribles = (page: Page): Locator =>
  seccion(page).getByRole('button', { name: /^Abrir / })

export const modalDeNivel = (
  page: Page,
  titulo: 'Nuevo nivel de acceso' | 'Renombrar nivel',
): Locator => page.getByRole('dialog', { name: titulo })

// La sección «Retirados»: sus filas son las de los niveles retirados.
export const retirados = (page: Page): Locator =>
  page.locator('section[aria-labelledby="titulo-de-retirados"]')
