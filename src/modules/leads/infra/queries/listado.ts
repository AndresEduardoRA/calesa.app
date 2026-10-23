import 'server-only'
import { errorDePostgrest, ok, type Resultado } from '@/shared/lib/errores'
import { conteoAcotado } from '@/shared/lib/conteo'
import { armarPagina, codificarCursor, type Cursor } from '@/shared/lib/paginacion'
import { aplicarCursor } from '@/shared/lib/supabase/consultas'
import { createClient } from '@/shared/lib/supabase/server'
import {
  condicionesDeLaPagina,
  cuentaPorCandidatos,
  filtrosDeCandidatos,
  usaCandidatos,
  ventanasHasta,
  type Candidatos,
  type PaginaDeLeads,
  type RecorridoAcotado,
} from '../../entities/candidatos'
import { fuenteDelListado } from '../../entities/fuente-del-listado'
import type { CondicionDeLead } from '../../entities/filtros'
import { columnasDeLaConsulta, filasDeLeadDesde, type FilaDeLead } from '../../entities/listado'
import type {
  BuscadorDeLeads,
  ContadorDeLeads,
  PedidoDeListado,
} from '../../entities/repositorios-del-listado'
import { leerCandidatos } from './candidatos'
import { contarPorCandidatos } from './conteo-de-leads'
import { aplicarCondicionesDeLeads } from './condiciones'

// Una página de leads, de lo más nuevo a lo más viejo, con una fila de más para saber si hay otra.
// Se lee de `leads_vista` (teléfono enmascarado y atributos recortados según la cartera) y lo que
// hay lo decide la RLS de `leads`. Bajo RLS un filtro sobre `atributos` o `nombre` no usa un índice
// propio: la base camina `leads_listado_idx` en orden, filtra y corta en `tamano + 1`.
// «Míos» (`en_cartera`) se lee de `leads_cartera_vista`: las mismas columnas y la misma RLS, pero la base camina la cartera de
// quien mira por `leads_asesores_listado_idx` (cuesta lo que pesa, no cuántos leads hay en la tabla; 5a-fix-1a).
//
// Una búsqueda por nombre (o un campo público filtrado) pide antes los candidatos a la base y lee la página de ellos (`leerPorCandidatos`).
export const buscarLeads: BuscadorDeLeads = async (pedido) => {
  const { condiciones, cursor, tamano, clavesDeTabla } = pedido
  const conTope = pedido.sinTope !== true
  const supabase = await createClient()
  const columnas = columnasDeLaConsulta(clavesDeTabla)
  if (usaCandidatos(condiciones, conTope)) {
    const porCandidatos = await leerPorCandidatos(supabase, pedido, columnas, conTope)
    if (porCandidatos !== null) {
      return porCandidatos
    }
  }
  const base =
    fuenteDelListado(condiciones) === 'leads_cartera_vista'
      ? supabase.from('leads_cartera_vista').select(columnas)
      : supabase.from('leads_vista').select(columnas)
  // Hacia atrás se camina al revés (lo más viejo primero) y `armarPagina` lo da vuelta.
  const haciaAtras = cursor?.sentido === 'anterior'
  const { data, error } = await aplicarCursor(aplicarCondicionesDeLeads(base, condiciones), cursor)
    .order('creado_en', { ascending: haciaAtras })
    .order('id', { ascending: haciaAtras })
    .limit(tamano + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({
    ...armarPagina(filasDeLeadDesde(data, clavesDeTabla), tamano, cursor),
    recorrido: null,
  })
}

// Las filas de esos candidatos, de `leads_vista_por_ids()`, con las condiciones que la página sigue aplicando, el cursor, el orden y el límite de siempre.
async function filasDeLosCandidatos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: readonly string[],
  datos: {
    pedido: PedidoDeListado
    deLaPagina: readonly CondicionDeLead[]
    columnas: string
    limite: number
  },
): Promise<Resultado<FilaDeLead[]>> {
  const { pedido, deLaPagina, columnas, limite } = datos
  const haciaAtras = pedido.cursor?.sentido === 'anterior'
  const { data, error } = await aplicarCursor(
    aplicarCondicionesDeLeads(
      supabase.rpc('leads_vista_por_ids', { p_leads: [...ids] }).select(columnas),
      deLaPagina,
    ),
    pedido.cursor,
  )
    .order('creado_en', { ascending: haciaAtras })
    .order('id', { ascending: haciaAtras })
    .limit(limite)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(filasDeLeadDesde(data, pedido.clavesDeTabla))
}

// Cuántos de esos candidatos cumplen lo que la página sigue aplicando, hasta `limite`: sólo cuenta ids, no trae columnas.
async function cuantosDeLosCandidatos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: readonly string[],
  condiciones: readonly CondicionDeLead[],
  limite: number,
): Promise<Resultado<number>> {
  const { data, error } = await aplicarCondicionesDeLeads(
    supabase.rpc('leads_vista_por_ids', { p_leads: [...ids] }).select('id'),
    condiciones,
  ).limit(limite)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(data.length)
}

// Hasta dónde llegó una ventana que se quedó en el tope: nulo si no se acotó (o no dijo hasta dónde).
function recorridoAcotado(
  candidatos: Candidatos,
  sentido: Cursor['sentido'],
): RecorridoAcotado | null {
  const { hasta } = candidatos
  if (candidatos.acotada !== true || hasta === null) {
    return null
  }
  return {
    recorridos: candidatos.recorridos ?? 0,
    hastaEn: hasta.creado_en,
    seguir: codificarCursor({ creadoEn: hasta.creado_en, id: hasta.id, sentido }),
  }
}

// La página de una búsqueda por candidatos (5a-fix-1b), en dos pasos: `leads_candidatos()` dice cuáles son los primeros que coinciden, en el
// orden del listado y después del cursor, sólo de lo que quien mira ve (el nombre y un campo público ya están cumplidos); `leads_vista_por_ids()` lee
// esas filas con las demás condiciones (las marcas, «míos», un campo privado…), el cursor, el orden y el límite de siempre. Si las marcas dejan la
// página corta y los candidatos no eran todos, pide la ventana que sigue, hasta `ventanasHasta(tamano)`. Nulo = volver al camino de siempre (leer la
// consulta completa): nunca peor que antes. Las ventanas son contiguas: lo que trae la segunda va después de lo que trajo la primera.
async function leerPorCandidatos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pedido: PedidoDeListado,
  columnas: string,
  conTope: boolean,
) {
  const { condiciones, cursor, tamano } = pedido
  const sentido = cursor?.sentido ?? 'siguiente'
  const deLaPagina = condicionesDeLaPagina(condiciones, conTope)
  let desde = cursor
  let juntas: FilaDeLead[] = []
  for (let ventana = 0; ventana < ventanasHasta(tamano); ventana++) {
    const candidatos = await leerCandidatos(
      supabase,
      filtrosDeCandidatos(condiciones, desde, sentido, conTope),
    )
    if (!candidatos.ok) {
      return candidatos
    }
    if (candidatos.data.ids.length > 0) {
      const filas = await filasDeLosCandidatos(supabase, candidatos.data.ids, {
        pedido,
        deLaPagina,
        columnas,
        limite: tamano + 1 - juntas.length,
      })
      if (!filas.ok) {
        return filas
      }
      juntas = juntas.concat(filas.data)
    }
    const { hasta } = candidatos.data
    if (juntas.length > tamano || candidatos.data.completa) {
      return ok<PaginaDeLeads>({ ...armarPagina(juntas, tamano, cursor), recorrido: null })
    }
    // El tope de un campo público (4.03, 5a-9): la ventana miró `recorridos` leads y se quedó ahí. No se pide otra (cada una costaría lo mismo): la página sale con lo que
    // juntó y dice hasta dónde llegó, con el cursor para seguir.
    const recorrido = recorridoAcotado(candidatos.data, sentido)
    if (recorrido !== null) {
      return ok<PaginaDeLeads>({ ...armarPagina(juntas, tamano, cursor), recorrido })
    }
    if (hasta === null) {
      return null
    }
    desde = { creadoEn: hasta.creado_en, id: hasta.id, sentido }
  }
  return null
}

// PostgREST corta un pedido en 1.000 filas (`max_rows` de `supabase/config.toml`).
const FILAS_POR_PEDIDO = 1000

// Cuántos leads cumplen las condiciones, **hasta `tope`**: lee ids por el índice del listado, de a 1.000 por
// cursor, hasta juntar `tope + 1`, y dice si había más (`.claude/rules/escala.md`: un número que se muestra no es
// un total). Lo decide la misma RLS que la página: cuenta sólo lo que quien mira ve. Con 50 es un solo pedido.
export const contarLeadsHasta: ContadorDeLeads = async (condiciones, tope) => {
  const supabase = await createClient()
  // Con un campo privado, por la ventana de candidatos: la vista calcula `atributos_lead()` en cada lead de la cartera (4.03, 5a-34).
  if (cuentaPorCandidatos(condiciones)) {
    const porCandidatos = await contarPorCandidatos({
      condiciones,
      tope,
      leerVentana: (filtros) => leerCandidatos(supabase, filtros),
      contarCandidatos: (ids, deLaPagina, limite) =>
        cuantosDeLosCandidatos(supabase, ids, deLaPagina, limite),
    })
    if (porCandidatos !== null) {
      return porCandidatos
    }
  }
  const fuente = fuenteDelListado(condiciones)
  let cursor: Cursor | null = null
  let leidos = 0
  while (leidos <= tope) {
    const pedir = Math.min(FILAS_POR_PEDIDO, tope + 1 - leidos)
    const { data, error } = await aplicarCursor(
      aplicarCondicionesDeLeads(
        fuente === 'leads_cartera_vista'
          ? supabase.from('leads_cartera_vista').select('id, creado_en')
          : supabase.from('leads_vista').select('id, creado_en'),
        condiciones,
      ),
      cursor,
    )
      .order('creado_en', { ascending: false })
      .order('id', { ascending: false })
      .limit(pedir)
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    leidos += data.length
    const ultimo = data.at(-1)
    if (data.length < pedir || !ultimo?.creado_en || !ultimo.id) {
      break
    }
    cursor = { creadoEn: ultimo.creado_en, id: ultimo.id, sentido: 'siguiente' }
  }
  return ok(conteoAcotado(leidos, tope))
}
