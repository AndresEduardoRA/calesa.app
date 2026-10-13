// Qué puede hacer una persona con el inventario. Es lo que la interfaz muestra; lo que protege
// es la base (`vehiculo_crear`, `vehiculo_guardar` y la policy de lectura), con la misma regla.
import { alcanceDe, origenesCon, puede, type Permisos } from '@/shared/lib/permisos'

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

export type PermisoDeAlta =
  // Sin el permiso en ese origen el botón no existe.
  | { estado: 'oculto' }
  // Lo espera poder hacer y no puede: se ve apagado, con el motivo.
  | { estado: 'deshabilitado'; motivo: string }
  | { estado: 'habilitado' }

export function permisoDeAlta(permisos: Permisos, origen: Origen): PermisoDeAlta {
  if (!puede(permisos, 'vehiculos.crear', origen.id)) {
    return { estado: 'oculto' }
  }
  return origen.activo
    ? { estado: 'habilitado' }
    : {
        estado: 'deshabilitado',
        motivo: `${origen.nombre} está desactivado: no recibe registros nuevos. Lo que ya tiene se sigue viendo y editando.`,
      }
}

type Editable = { id: string; origenId: string; creadoPor: string | null; leadId: string | null }

// ¿Puede editar este vehículo? Con alcance «todos», sí. Con «propios», lo que creó o lo que está
// vinculado a un lead de su cartera: eso último sólo lo sabe la base (`vehiculos_editables`), y
// llega acá como `loDiceLaBase`.
export function puedeEditar(
  permisos: Permisos,
  vehiculo: Pick<Editable, 'origenId' | 'creadoPor'>,
  usuarioId: string,
  loDiceLaBase = false,
): boolean {
  const alcance = alcanceDe(permisos, 'vehiculos.editar', vehiculo.origenId)
  return (
    alcance === 'todos' ||
    (alcance === 'propios' && (vehiculo.creadoPor === usuarioId || loDiceLaBase))
  )
}

// Por cuáles hay que preguntarle a la base: los que la persona no creó, con alcance «propios», y
// que tienen un vínculo (sin lead no hay cartera que valga). Suelen ser pocos o ninguno.
export function candidatosPorCartera(
  permisos: Permisos,
  vehiculos: readonly Editable[],
  usuarioId: string,
): string[] {
  return vehiculos
    .filter(
      (vehiculo) =>
        vehiculo.leadId !== null &&
        vehiculo.creadoPor !== usuarioId &&
        alcanceDe(permisos, 'vehiculos.editar', vehiculo.origenId) === 'propios',
    )
    .map((vehiculo) => vehiculo.id)
}
