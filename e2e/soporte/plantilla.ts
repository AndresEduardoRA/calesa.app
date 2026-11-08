// El terreno del e2e de la plantilla de la tarjeta por PostgREST (4.19-3a): un origen con la fórmula «mini» del juego común (`casos-de-plantilla.json`) publicada, la dueña y
// una asesora de la semilla que no configura nada, cada una con su sesión. Sin página: lo que la base entrega y niega a cada persona. Todo lo que crea lleva el prefijo de
// `cotizar-formula` y se borra con `borrarOrigenesDeCotizar()` (las plantillas caen con su origen).
import { readFileSync } from 'node:fs'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Plantilla } from '../../src/modules/cotizaciones/entities/plantilla/forma-de-plantilla'
import { CONTRASENA } from './alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './cotizar-formula'
import { sesionDe } from './leads-alta'
import { crearAsesoraDeLaSemilla } from './recorrido'
import { literal, sql } from './sql'

export type TerrenoDePlantilla = {
  origenId: string
  duena: SupabaseClient
  asesora: SupabaseClient
}

const RUTA_DEL_JUEGO = 'src/modules/cotizaciones/entities/plantilla/casos-de-plantilla.json'

type CasoDelJuego = { nombre: string; formula: string; valida?: boolean; plantilla: unknown }
type FormulaDelJuego = { definicion: unknown; diseno: unknown; visibilidad: unknown }
const juego = (): { formulas: Record<string, FormulaDelJuego>; casos: CasoDelJuego[] } =>
  JSON.parse(readFileSync(RUTA_DEL_JUEGO, 'utf8'))

// La «mini» del juego, la de las carreras del 4.19-1. No se usa la fórmula de prueba de la hoja: esconde cosas por nivel y la tarjeta no puede mostrarlas.
function publicarLaFormulaMini(origenId: string): void {
  const mini = juego().formulas['mini']
  if (!mini) throw new Error('El juego no trae la fórmula «mini».')
  const json = (v: unknown) => `$e2e$${JSON.stringify(v)}$e2e$::jsonb`
  sql(`
    insert into public.formulas (origen_id, estado, version, definicion, params, diseno, visibilidad, nota)
    values (${literal(origenId)}::uuid, 'publicada', 1, ${json(mini.definicion)}, '{}'::jsonb, ${json(mini.diseno)}, ${json(mini.visibilidad)}, 'E2E 4.19-3a')`)
}

export async function prepararTerrenoDePlantilla(proyecto: string): Promise<TerrenoDePlantilla> {
  await limpiarTerrenoDePlantilla()
  const correoDuena = correoDePrueba(`duena-plantilla-${proyecto}`)
  await crearDuenaDePrueba({
    email: correoDuena,
    contrasena: CONTRASENA,
    nombre: 'Dalia Plantilla',
  })
  const asesora = await crearAsesoraDeLaSemilla(proyecto)
  const origen = await crearOrigenDeCotizar(proyecto, 'plantilla', false)
  publicarLaFormulaMini(origen.id)
  return {
    origenId: origen.id,
    duena: await sesionDe(correoDuena, CONTRASENA),
    asesora: await sesionDe(asesora.email, CONTRASENA),
  }
}

export async function limpiarTerrenoDePlantilla(): Promise<void> {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
}

// La plantilla válida más corta del juego para esa fórmula (sin tonos), con `marca` en la nota para distinguir una definición de otra.
export function plantillaValida(marca: string): Plantilla {
  const caso = juego().casos.find(
    (c) => c.valida === true && c.formula === 'mini' && c.nombre.startsWith('mínima'),
  )
  if (!caso) throw new Error('El juego no trae el caso «mínima».')
  return { ...(caso.plantilla as Plantilla), nota: `Nota ${marca}` }
}
