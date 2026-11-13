// El cuerpo de la acción `crearImportacion` (9.06-4), con lo que toca la base inyectado para probarlo: el permiso antes de la base (D39), la
// ruta armada con quien llama (D36), `importacion_crear` y el despertar de la función, que no hace esperar (D40).
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { rutaDelArchivo } from '../../../entities/archivo-de-importacion'
import { motivoParaNoImportar } from '../../../entities/permiso-de-importar'
import type { EntidadImportable } from '../../../entities/plantillas'
import type { EntradaCrearImportacion } from '../schemas/importacion'

export type PedidoDeImportacion = {
  id: string
  entidad: EntidadImportable
  ruta: string
  mapeo: Record<string, string | null>
  asignarA: string | null
  origenId: string | null
}

export type ImportacionCreada = { id: string; repetido: boolean }

export type DependenciasDeCrear = {
  crear: (pedido: PedidoDeImportacion) => Promise<Resultado<ImportacionCreada>>
  pedirPase: (importacionId: string) => Promise<Resultado<string>>
  // Agenda el despertar para después de responder (`after()`); no se espera.
  despertar: (pase: string, importacionId: string) => void
}

// Ni la ruta, ni una celda, ni el pase: sólo el id (C12 de la parte 3).
export const avisoDeEspera = (importacionId: string) =>
  `datos: la importación ${importacionId} espera al job`

export async function crearConPermiso(
  ctx: { usuarioId: string; permisos: Permisos },
  entrada: EntradaCrearImportacion,
  dependencias: DependenciasDeCrear,
): Promise<Resultado<ImportacionCreada>> {
  // Un destino igual a quien importa es importar para sí (D39).
  const asignarA = entrada.asignarA === ctx.usuarioId ? null : entrada.asignarA
  const motivo = motivoParaNoImportar(ctx.permisos, ctx.usuarioId, {
    entidad: entrada.entidad,
    asignarA,
    origenId: entrada.origenId,
  })
  if (motivo !== null) {
    return fallo('sin_permiso', motivo)
  }
  const creada = await dependencias.crear({
    id: entrada.id,
    entidad: entrada.entidad,
    ruta: rutaDelArchivo(ctx.usuarioId, entrada.id),
    mapeo: entrada.mapeo,
    asignarA,
    origenId: entrada.origenId,
  })
  if (!creada.ok) {
    return creada
  }
  // El pase con la sesión del pedido, ahora: dentro de `after()` no se leen cookies. Sin él, el job la despierta en ≤ 2 min.
  const pase = await dependencias.pedirPase(creada.data.id)
  if (pase.ok) {
    dependencias.despertar(pase.data, creada.data.id)
  } else {
    console.warn(avisoDeEspera(creada.data.id))
  }
  return ok(creada.data)
}
