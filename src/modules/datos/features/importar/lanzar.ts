// Lanzar la importación total (9.06-4): subir el archivo normalizado → crear la importación → (la acción despierta la función). Puro, con lo
// que toca la red inyectado: la 4b le pasa los dos de `composicion.client` y el `crear` de la acción por `useAction`.
//
// - Si la subida falla, no se crea nada.
// - Si crear falla con un rechazo seguro de la base (sin permiso, una regla o la validación: nunca deja la fila creada), se borra el objeto
//   propio. Con un fallo dudoso (sin red, la acción cortada, un inesperado) **no**: el insert y el despertar pueden haber ocurrido, y
//   reintentar con el mismo id y el mismo texto da `repetido` sobre una importación con su archivo (D37).
// - El id nace con cada archivo armado: sólo se reintenta con el mismo id si el texto es idéntico (D36).
import type { CodigoError, Resultado } from '@/shared/lib/errores'
import { rutaDelArchivo } from '../../entities/archivo-de-importacion'
import type { EntradaCrearImportacion } from './schemas/importacion'

export type ImportacionLanzada = { id: string; repetido: boolean }

export type DependenciasDeLanzar = {
  subir: (ruta: string, texto: string) => Promise<Resultado<null>>
  crear: (pedido: EntradaCrearImportacion) => Promise<Resultado<ImportacionLanzada>>
  quitar: (ruta: string) => Promise<void>
}

const RECHAZOS_SEGUROS: ReadonlySet<CodigoError> = new Set(['sin_permiso', 'regla', 'validacion'])

export async function lanzarImportacion(
  {
    usuarioId,
    pedido,
    texto,
  }: { usuarioId: string; pedido: EntradaCrearImportacion; texto: string },
  { subir, crear, quitar }: DependenciasDeLanzar,
): Promise<Resultado<ImportacionLanzada>> {
  const ruta = rutaDelArchivo(usuarioId, pedido.id)
  const subido = await subir(ruta, texto)
  if (!subido.ok) {
    return subido
  }
  const creada = await crear(pedido)
  if (!creada.ok && RECHAZOS_SEGUROS.has(creada.error.codigo)) {
    await quitar(ruta)
  }
  return creada
}
