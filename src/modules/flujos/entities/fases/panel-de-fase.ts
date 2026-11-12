// Los paneles de la lista de fases que viven en la URL (D4, D13) y cuándo no se abren. Lo que hay en la URL se revisa una vez al llegar
// (`useRevisionAlAbrir`): un valor escrito a mano que no apunta a nada no abre, se avisa y la URL se limpia.
import { TOPE_DE_FASES } from '../flujo'

type ConFases = { fases: readonly { id: string; activa: boolean }[] }

// `?panel=nueva-fase`: el modal de «Nueva fase».
export const PANEL_NUEVA_FASE = 'nueva-fase'
// `?panel=eliminar-fase&quitar=<id>`: la confirmación de «Jubilar o eliminar». `?fase=` ya abre el inspector, por eso no se reusa.
export const PANEL_ELIMINAR_FASE = 'eliminar-fase'
export const CLAVE_DE_FASE_A_QUITAR = 'quitar'

export const MOTIVO_DE_FASE_NO_DISPONIBLE = 'Esa fase ya no está en este flujo.'
export const MOTIVO_DE_FASE_YA_JUBILADA =
  'Esa fase ya está jubilada: reactívala si la quieres usar.'

export function textoDelTopeDeFases(): string {
  return `Este flujo ya tiene ${String(TOPE_DE_FASES)} fases, el máximo posible.`
}

export function alTopeDeFases(flujo: ConFases): boolean {
  return flujo.fases.length >= TOPE_DE_FASES
}

// «Nueva fase» no abre con el flujo al tope; nulo si se puede.
export function motivoParaNoAbrirNuevaFase(flujo: ConFases): string | null {
  return alTopeDeFases(flujo) ? textoDelTopeDeFases() : null
}

// «Jubilar o eliminar» sólo abre para una fase del flujo que sigue activa: una que no está (otra persona la eliminó, o un id inventado) o que ya
// está jubilada no tiene nada que confirmar acá.
export function motivoParaNoQuitarFase(flujo: ConFases, id: string | null): string | null {
  const fase = id === null ? undefined : flujo.fases.find((f) => f.id === id)
  if (fase === undefined) {
    return MOTIVO_DE_FASE_NO_DISPONIBLE
  }
  return fase.activa ? null : MOTIVO_DE_FASE_YA_JUBILADA
}

// Lo que cambia entre dos lecturas del orden: si la lista ya trae el orden nuevo, el foco puede volver al botón (D16).
export function firmaDelOrdenDeFases(fases: readonly { id: string }[]): string {
  return fases.map((f) => f.id).join('|')
}
