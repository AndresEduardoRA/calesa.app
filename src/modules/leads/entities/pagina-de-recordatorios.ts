// Los recordatorios de un lead por páginas (`lead_recordatorios()`, 9d-2): dos listas con su cursor,
// los pendientes (los vencidos primero: `recordar_en` ascendente) y los completados (el último que se
// completó arriba), que se leen sólo al abrir su plegado. Sin conteo: cuántos hay no se dice.
import { z } from 'zod'
import { recordatoriosDesde, type Recordatorio } from './recordatorios'

export type PaginaDeRecordatorios = {
  recordatorios: Recordatorio[]
  hayMas: boolean
  // Lead en la cartera y `leads.editar`: agendar uno nuevo (la base vuelve a mirar al crear).
  puedoAgendar: boolean
  // Hay alguno completado: se ofrece el plegado «Completados».
  hayCompletados: boolean
}

// Dónde sigue la página siguiente: el último de la lista que se tiene. Viaja tal como lo dio la base
// (como texto: pasarlo por `Date` pierde los microsegundos y repetiría o saltearía filas).
export type CursorDeRecordatorios = { desdeEn: string; desdeId: string }

const esquemaPagina = z.object({
  recordatorios: z.array(z.unknown()),
  hay_mas: z.boolean(),
  puedo_agendar: z.boolean(),
  hay_completados: z.boolean(),
})

// La página de `lead_recordatorios()`. Una fila que no cumple se descarta; una página rota es `null`.
export function paginaDeRecordatoriosDesde(crudo: unknown): PaginaDeRecordatorios | null {
  const leido = esquemaPagina.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  return {
    recordatorios: recordatoriosDesde(leido.data.recordatorios),
    hayMas: leido.data.hay_mas,
    puedoAgendar: leido.data.puedo_agendar,
    hayCompletados: leido.data.hay_completados,
  }
}

// El cursor de «Ver más» de una de las dos listas: el último que se tiene, por su orden.
export function cursorDeRecordatorios(
  lista: readonly Recordatorio[],
  completados: boolean,
): CursorDeRecordatorios | null {
  const ultimo = lista.at(-1)
  if (!ultimo) {
    return null
  }
  const desdeEn = completados ? ultimo.completadoEn : ultimo.recordarEn
  return desdeEn === null ? null : { desdeEn, desdeId: ultimo.id }
}
