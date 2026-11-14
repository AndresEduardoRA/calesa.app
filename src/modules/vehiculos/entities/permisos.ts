// Qué puede hacer una persona con el inventario. Es lo que la interfaz muestra; lo que protege
// es la base (`vehiculo_crear`, `vehiculo_guardar` y la policy de lectura), con la misma regla.
import {
  alcanceDe,
  origenesCon,
  puede,
  type ClavePermiso,
  type Permisos,
} from '@/shared/lib/permisos'

type Origen = { id: string; nombre: string; activo: boolean }

// Los orígenes cuya pestaña ve: donde tiene `vehiculos.ver`, también los desactivados (sus
// vehículos se siguen viendo). Espejo de `origenes_con_permiso('vehiculos.ver')`.
export function origenesVisibles<O extends Origen>(
  permisos: Permisos,
  origenes: readonly O[],
): O[] {
  const donde = origenesCon(permisos, 'vehiculos.ver')
  return donde === 'todos' ? [...origenes] : origenes.filter((origen) => donde.includes(origen.id))
}

// La pestaña de la URL si es una de las suyas; si no (o si no vino), la primera.
export function origenElegido<O extends Origen>(
  visibles: readonly O[],
  pedido: string | undefined,
): O | null {
  return visibles.find((origen) => origen.id === pedido) ?? visibles[0] ?? null
}

// Desde dónde se da de alta (`vehiculo_crear(…, p_contexto)`): el inventario (y la importación) o la hoja de cotizar. Cada uno, su permiso.
export type ContextoDeAlta = 'suelto' | 'cotizar'

export const PERMISO_DE_ALTA = {
  suelto: 'vehiculos.crear',
  cotizar: 'vehiculos.crear.desde_cotizar',
} as const satisfies Record<ContextoDeAlta, string>

export const MOTIVO_SOLO_DESDE_COTIZAR =
  'Tu rol da de alta vehículos sólo desde la hoja de cotizar: cotiza uno nuevo y se crea ahí.'

export type PermisoDeAlta =
  // Sin el permiso en ese origen el botón no existe.
  | { estado: 'oculto' }
  // Lo espera poder hacer y no puede: se ve apagado, con el motivo. `desdeCotizar`: no tiene el alta suelta pero sí la de la hoja de cotizar,
  // así que el aviso ofrece «Cotizar un vehículo nuevo».
  | { estado: 'deshabilitado'; motivo: string; desdeCotizar?: true }
  | { estado: 'habilitado' }

export function permisoDeAlta(
  permisos: Permisos,
  origen: Origen,
  contexto: ContextoDeAlta = 'suelto',
): PermisoDeAlta {
  if (!puede(permisos, PERMISO_DE_ALTA[contexto], origen.id)) {
    return contexto === 'suelto' &&
      puede(permisos, PERMISO_DE_ALTA.cotizar, origen.id) &&
      origen.activo
      ? { estado: 'deshabilitado', motivo: MOTIVO_SOLO_DESDE_COTIZAR, desdeCotizar: true }
      : { estado: 'oculto' }
  }
  return origen.activo
    ? { estado: 'habilitado' }
    : {
        estado: 'deshabilitado',
        motivo: `${origen.nombre} está desactivado: no recibe registros nuevos. Lo que ya tiene se sigue viendo y editando.`,
      }
}

type Editable = { id: string; origenId: string; creadoPor: string | null; leadId: string | null }

// Los permisos sobre un vehículo que llevan alcance: la misma regla para los dos.
export type PermisoConAlcance = Extract<ClavePermiso, 'vehiculos.editar' | 'vehiculos.eliminar'>

// ¿Tiene este permiso sobre este vehículo? Con alcance «todos», sí. Con «propios», lo que creó o
// lo que está vinculado a un lead de su cartera: eso último sólo lo sabe la base
// (`vehiculos_con_permiso`), y llega acá como `loDiceLaBase`.
export function puedeSobre(
  pedido: { permisos: Permisos; clave: PermisoConAlcance; usuarioId: string },
  vehiculo: Pick<Editable, 'origenId' | 'creadoPor'>,
  loDiceLaBase = false,
): boolean {
  const alcance = alcanceDe(pedido.permisos, pedido.clave, vehiculo.origenId)
  return (
    alcance === 'todos' ||
    (alcance === 'propios' && (vehiculo.creadoPor === pedido.usuarioId || loDiceLaBase))
  )
}

export function puedeEditar(
  permisos: Permisos,
  vehiculo: Pick<Editable, 'origenId' | 'creadoPor'>,
  usuarioId: string,
  loDiceLaBase = false,
): boolean {
  return puedeSobre({ permisos, clave: 'vehiculos.editar', usuarioId }, vehiculo, loDiceLaBase)
}

// Por cuáles hay que preguntarle a la base: los que la persona no creó, con alcance «propios», y
// que tienen un vínculo (sin lead no hay cartera que valga). Suelen ser pocos o ninguno.
export function candidatosPorCartera(
  permisos: Permisos,
  vehiculos: readonly Editable[],
  usuarioId: string,
  clave: PermisoConAlcance = 'vehiculos.editar',
): string[] {
  return vehiculos
    .filter(
      (vehiculo) =>
        vehiculo.leadId !== null &&
        vehiculo.creadoPor !== usuarioId &&
        alcanceDe(permisos, clave, vehiculo.origenId) === 'propios',
    )
    .map((vehiculo) => vehiculo.id)
}
