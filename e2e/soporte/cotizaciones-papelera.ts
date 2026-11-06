// El terreno de la papelera de cotizaciones (paso 4.24-2): un origen con su fórmula, la dueña, Ana («propios»: ve y edita lo suyo), Eva (lo mismo, sin lotes) y quien sólo ve.
// Las cotizaciones se siembran por SQL con título propio y se mandan a la papelera con la RPC y la sesión de quien las envía (como lo haría otra pestaña). Lo deshace
// `limpiarPapelera()`: los lotes antes que las personas (un lote recuerda quién lo envió) y lo demás por `limpiarGuardado()`.
import { CONTRASENA } from './alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './base'
import { idDePersona, sembrarCotizaciones } from './cotizaciones-sembradas'
import { borrarOrigenesDeCotizar } from './cotizar-formula'
import { limpiarGuardado, prepararGuardado } from './cotizar-guardar'
import { borrarLeadsDePrueba } from './leads'
import { rpcComo } from './leads-cartera'
import { borrarLotesDePrueba } from './papelera'
import { literal, sql } from './sql'

export type TerrenoDeLaPapelera = Awaited<ReturnType<typeof prepararPapelera>>

// Un lote no se borra mientras una cotización lo nombra (`cotizaciones_lote_papelera_id_fkey`) y una persona no se borra mientras un lote la nombra: primero las
// cotizaciones (las del origen de la prueba), después los lotes y al final lo de siempre.
async function vaciarLaPapelera(): Promise<void> {
  borrarOrigenesDeCotizar()
  await borrarLotesDePrueba()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
}

export async function prepararPapelera(proyecto: string) {
  await vaciarLaPapelera()
  const { origen, duena } = await prepararGuardado(proyecto, 'papelera')
  const ana = correoDePrueba(`ana-papelera-${proyecto}`)
  const eva = correoDePrueba(`eva-papelera-${proyecto}`)
  const soloVer = correoDePrueba(`solover-papelera-${proyecto}`)
  for (const [email, nombre] of [
    [ana, 'Ana Papelera'],
    [eva, 'Eva Papelera'],
    [soloVer, 'Vera Sólo Ve'],
  ] as const) {
    await crearPersona({ email, contrasena: CONTRASENA, nombre, invitada: true })
  }
  for (const [email, clave] of [
    [ana, 'e2e_papelera_ana'],
    [eva, 'e2e_papelera_eva'],
  ] as const) {
    await darRolDePrueba({
      email,
      rol: { nombre: `${PREFIJO_ROL_E2E}Papelera ${clave}`, clave },
      permisos: [
        { clave: 'cotizaciones.ver', origenId: origen.id, alcance: 'propios' },
        { clave: 'cotizaciones.editar', origenId: origen.id, alcance: 'propios' },
      ],
    })
  }
  await darRolDePrueba({
    email: soloVer,
    rol: { nombre: `${PREFIJO_ROL_E2E}Papelera sólo ve`, clave: 'e2e_papelera_solo_ve' },
    permisos: [{ clave: 'cotizaciones.ver', origenId: origen.id, alcance: 'todos' }],
  })
  return { origen, duena, ana, eva, soloVer }
}

// Siembra una cotización por título (preventas, sin vehículo ni cliente) de quien las crea y devuelve sus ids en el orden de los títulos. Lo único que las distingue de
// las demás es su título: una prueba las busca por él.
export function sembrarConTitulos(datos: {
  origenId: string
  creadoPor: string
  titulos: readonly string[]
}): string[] {
  const { origenId, creadoPor, titulos } = datos
  sembrarCotizaciones({ origenId, creadoPor: idDePersona(creadoPor), cuantas: titulos.length })
  const lista = titulos.map((titulo) => literal(titulo)).join(', ')
  const ids = sql(`
    begin;
    set local session_replication_role = replica;
    with f as (select id, row_number() over (order by numero) r from public.cotizaciones
                where origen_id = ${literal(origenId)}::uuid and creado_por = ${literal(idDePersona(creadoPor))}::uuid
                  and titulo like 'Sembrada %' and eliminado_en is null),
         u as (update public.cotizaciones c set titulo = (array[${lista}])[f.r] from f where c.id = f.id returning c.id, f.r)
    select id from u order by r;
    commit;`)
  return ids.split('\n').filter((id) => id !== '')
}

export const titulosNumerados = (n: number, prefijo: string): string[] =>
  Array.from({ length: n }, (_, i) => `${prefijo} ${String(i + 1)}`)

// Manda a la papelera, con la sesión de quien envía y la versión de cada una, y devuelve el lote y su versión. Una rechazada es un error de la prueba.
export async function enviarAPapelera(
  email: string,
  ids: readonly string[],
): Promise<{ lote: string; actualizadoEn: string }> {
  const items = JSON.parse(
    sql(`select coalesce(jsonb_agg(jsonb_build_object('id', id, 'actualizado_en', actualizado_en) order by numero), '[]'::jsonb)
           from public.cotizaciones where id in (${ids.map((id) => literal(id)).join(', ')})`),
  ) as unknown
  const envio = await rpcComo(email, 'cotizaciones_papelera_enviar', { p_cotizaciones: items })
  if (envio.error) {
    throw new Error(`No se pudo enviar a la papelera: ${envio.error.message}`)
  }
  const respuesta = envio.data as { lote: string | null; rechazados: unknown[] }
  if (respuesta.lote === null || respuesta.rechazados.length > 0) {
    throw new Error(`La papelera rechazó cotizaciones: ${JSON.stringify(respuesta.rechazados)}`)
  }
  return { lote: respuesta.lote, actualizadoEn: versionDelLote(respuesta.lote) }
}

export const versionDelLote = (lote: string): string =>
  sql(`select actualizado_en from public.lotes_papelera where id = ${literal(lote)}::uuid`)

// Cómo está una cotización en la base: viva (`null`) o en la papelera (su fecha); `undefined` si ya no existe.
export function estadoEnLaBase(id: string): { eliminadoEn: string | null } | undefined {
  const fila = sql(
    `select coalesce(eliminado_en::text, '') from public.cotizaciones where id = ${literal(id)}::uuid`,
  )
  if (
    fila === '' &&
    sql(`select count(*) from public.cotizaciones where id = ${literal(id)}::uuid`) === '0'
  ) {
    return undefined
  }
  return { eliminadoEn: fila === '' ? null : fila }
}

export async function limpiarPapelera(): Promise<void> {
  await vaciarLaPapelera()
  await limpiarGuardado()
  await borrarRolesDePrueba()
}
