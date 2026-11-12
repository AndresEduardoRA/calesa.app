// Las unidades que ya están en una fase y no cumplen un requisito bloqueante (`flujo_fuera_de_regla`): cómo se leen, se agrupan por fase y se dicen. La base
// devuelve ids sin títulos (los títulos los resuelve `src/app` con la RLS de quien mira: `flujos` no importa `vehiculos`). Sin I/O.
import { z } from 'zod'
import { conteoCorto, type ConteoAcotado } from '@/shared/lib/conteo'
import type { FaseParaConfigurar } from '../flujo'

// El tope por omisión de `flujo_fuera_de_regla(p_flujo, p_tope)`: coincide con su `_acotar_pagina(p_tope, 50, 100)`. La base devuelve a lo sumo uno más.
export const TOPE_DE_FUERA_DE_REGLA = 50
// El panel de «fuera de regla»: `?panel=fuera-de-regla`.
export const PANEL_FUERA_DE_REGLA = 'fuera-de-regla'

export const TITULO_QUE_NO_SE_VE = 'Un vehículo que no puedes ver'
export const TITULO_DE_ITEM_DE_REPUESTOS = 'Ítem de repuestos'
// Cuando no se pudieron leer los títulos: no se dice «no puedes verlo» (sería mentir sobre el permiso).
export const TITULO_SIN_LEER = 'Vehículo'

export type UnidadFueraDeRegla = {
  faseId: string
  // Una de las dos: un vehículo o un ítem de repuestos.
  vehiculoId: string | null
  repuestoId: string | null
  // Cuántos requisitos bloqueantes de la fase no cumple.
  faltan: number
}

const esquemaDeFila = z
  .object({
    vehiculo_id: z.guid().nullable(),
    repuesto_id: z.guid().nullable(),
    fase_id: z.guid(),
    faltan: z.number().int().min(1),
  })
  .refine((f) => (f.vehiculo_id === null) !== (f.repuesto_id === null))

// Las filas de la base; lo que no se entiende es `null` (el repositorio lo dice como error), nunca una lista a medias.
export function unidadesFueraDeReglaDesde(crudo: unknown): UnidadFueraDeRegla[] | null {
  const leidas = z.array(esquemaDeFila).safeParse(crudo)
  return leidas.success
    ? leidas.data.map((f) => ({
        faseId: f.fase_id,
        vehiculoId: f.vehiculo_id,
        repuestoId: f.repuesto_id,
        faltan: f.faltan,
      }))
    : null
}

// «5 unidades fuera de regla», «1 unidad fuera de regla» o «50+ unidades fuera de regla».
export function textoDelAviso(conteo: ConteoAcotado, locale?: string): string {
  const cuantas = conteoCorto(conteo, locale === undefined ? {} : { locale })
  return !conteo.hayMas && conteo.n === 1
    ? '1 unidad fuera de regla'
    : `${cuantas} unidades fuera de regla`
}

export const textoDeFaltan = (faltan: number) =>
  faltan === 1 ? 'Le falta 1 requisito' : `Le faltan ${String(faltan)} requisitos`

export type UnidadDelPanel = { clave: string; titulo: string; faltan: number }
export type GrupoFueraDeRegla = {
  faseId: string
  faseNombre: string
  unidades: UnidadDelPanel[]
}

// Agrupa por fase en el orden en que llegan (la base las trae por orden de fase). `titulos` son los de los vehículos que quien mira puede ver; `null` si no se
// pudieron leer. Un grupo de fase jubilada lo dice; una fase que ya no está en el flujo, también.
export function armarFueraDeRegla(
  unidades: readonly UnidadFueraDeRegla[],
  titulos: ReadonlyMap<string, string> | null,
  fases: readonly Pick<FaseParaConfigurar, 'id' | 'nombre' | 'activa'>[],
): GrupoFueraDeRegla[] {
  const grupos: GrupoFueraDeRegla[] = []
  const porFase = new Map<string, GrupoFueraDeRegla>()
  for (const u of unidades) {
    let grupo = porFase.get(u.faseId)
    if (grupo === undefined) {
      const fase = fases.find((f) => f.id === u.faseId)
      grupo = {
        faseId: u.faseId,
        faseNombre:
          fase === undefined
            ? 'Fase que ya no existe'
            : fase.activa
              ? fase.nombre
              : `${fase.nombre} (jubilada)`,
        unidades: [],
      }
      porFase.set(u.faseId, grupo)
      grupos.push(grupo)
    }
    const clave = u.vehiculoId ?? u.repuestoId ?? ''
    const titulo =
      u.vehiculoId === null
        ? TITULO_DE_ITEM_DE_REPUESTOS
        : titulos === null
          ? TITULO_SIN_LEER
          : (titulos.get(u.vehiculoId) ?? TITULO_QUE_NO_SE_VE)
    grupo.unidades.push({ clave, titulo, faltan: u.faltan })
  }
  return grupos
}
