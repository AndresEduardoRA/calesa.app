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

// Una de las dos listas cargada: lo que se tiene y si hay más.
export type ListaCargada = { lista: readonly Recordatorio[]; hayMas: boolean }

// Las dos listas de un lead: los completados son `null` mientras no se abrió su plegado.
export type ListasDeRecordatorios = {
  pendientes: ListaCargada
  completados: ListaCargada | null
  hayCompletados: boolean
}

const instante = (iso: string | null) => (iso === null ? 0 : Date.parse(iso))

// El orden de cada lista (el de la base): negativo si `a` va antes que `b`.
function ordenDePendientes(a: Recordatorio, b: Recordatorio): number {
  const d = instante(a.recordarEn) - instante(b.recordarEn)
  return d !== 0 ? d : a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}
function ordenDeCompletados(a: Recordatorio, b: Recordatorio): number {
  const d = instante(b.completadoEn) - instante(a.completadoEn)
  return d !== 0 ? d : b.id < a.id ? -1 : b.id > a.id ? 1 : 0
}

// Lo pone en su lugar si cae dentro de lo cargado (sin más por cargar, todo es «dentro»): fuera
// correría el cursor y «Ver más» saltearía filas; vuelve con «Ver más», en su versión de ese momento.
function ponerEn(
  cargada: ListaCargada,
  uno: Recordatorio,
  orden: (a: Recordatorio, b: Recordatorio) => number,
): ListaCargada {
  const ultimo = cargada.lista.at(-1)
  if (cargada.hayMas && (ultimo === undefined || orden(uno, ultimo) > 0)) {
    return cargada
  }
  return { ...cargada, lista: [...cargada.lista, uno].sort(orden) }
}

// Lo que vuelve de una acción (crear, editar, completar, reabrir, eliminar, restaurar): sale de donde
// estaba y entra en la lista que le toca por su estado, si cae dentro de lo cargado. Completar uno
// enciende «Completados» aunque su lista no se haya abierto.
export function ponerEnLasListas(
  listas: ListasDeRecordatorios,
  uno: Recordatorio & { eliminado?: boolean },
): ListasDeRecordatorios {
  const fuera = (cargada: ListaCargada): ListaCargada => ({
    ...cargada,
    lista: cargada.lista.filter((r) => r.id !== uno.id),
  })
  const pendientes = fuera(listas.pendientes)
  const completados = listas.completados === null ? null : fuera(listas.completados)
  if (uno.eliminado) {
    return { ...listas, pendientes, completados }
  }
  const { eliminado: _eliminado, ...recordatorio } = uno
  if (recordatorio.completadoEn === null) {
    return {
      ...listas,
      pendientes: ponerEn(pendientes, recordatorio, ordenDePendientes),
      completados,
    }
  }
  return {
    pendientes,
    completados:
      completados === null ? null : ponerEn(completados, recordatorio, ordenDeCompletados),
    hayCompletados: true,
  }
}
