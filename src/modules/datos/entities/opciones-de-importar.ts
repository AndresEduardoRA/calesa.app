// Qué puede importar cada quien en la sección «Importar» de `/datos` (9.06-4b): leads para sí (`leads.crear`) o para otra persona
// (`datos.importar.todo`), y vehículos en los orígenes **activos** donde tiene `vehiculos.crear`. Sólo dibuja: la acción lo vuelve a mirar
// (`motivoParaNoImportar`) y la base lo exige (`importacion_crear`). Sin I/O.
import { puede, type Permisos } from '@/shared/lib/permisos'
import type { EntidadImportable } from './plantillas'

// A quién se le pueden dar los leads: la tabla del equipo, de decenas de filas. Si algún día pasa de 100, se suma la búsqueda por nombre.
export const TOPE_DE_DESTINOS = 100

export type OrigenParaImportar = { id: string; nombre: string }

export type OpcionesDeImportar = {
  // `null`: no puede importar leads.
  leads: { yo: boolean; otros: boolean } | null
  vehiculos: OrigenParaImportar[]
}

export function opcionesDeImportar(
  permisos: Permisos,
  origenes: readonly { id: string; nombre: string; activo: boolean }[],
): OpcionesDeImportar {
  const yo = puede(permisos, 'leads.crear')
  const otros = puede(permisos, 'datos.importar.todo')
  return {
    leads: yo || otros ? { yo, otros } : null,
    vehiculos: origenes
      .filter((origen) => origen.activo && puede(permisos, 'vehiculos.crear', origen.id))
      .map(({ id, nombre }) => ({ id, nombre })),
  }
}

export function puedeImportar(opciones: OpcionesDeImportar): boolean {
  return opciones.leads !== null || opciones.vehiculos.length > 0
}

// Para la pestaña, sin leer orígenes: alcanza con tener `vehiculos.crear` en alguno (`puede` sin origen).
export function puedeImportarAlgo(permisos: Permisos): boolean {
  return (
    puede(permisos, 'leads.crear') ||
    puede(permisos, 'datos.importar.todo') ||
    puede(permisos, 'vehiculos.crear')
  )
}

// La entidad pedida si se puede importar; si no, la primera que se pueda.
export function entidadElegida(
  valor: string | undefined,
  opciones: OpcionesDeImportar,
): EntidadImportable | null {
  const disponibles: EntidadImportable[] = [
    ...(opciones.leads ? (['leads'] as const) : []),
    ...(opciones.vehiculos.length > 0 ? (['vehiculos'] as const) : []),
  ]
  return disponibles.find((entidad) => entidad === valor) ?? disponibles[0] ?? null
}

// El origen pedido si está entre los de vehículos; si no, ninguno (hay que elegirlo).
export function origenElegido(
  valor: string | undefined,
  opciones: OpcionesDeImportar,
): string | null {
  return opciones.vehiculos.find((origen) => origen.id === valor)?.id ?? null
}
