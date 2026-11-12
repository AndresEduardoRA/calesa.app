import type { FilaDeCatalogo } from '@/shared/ui/lista-de-catalogo/tipos'
import {
  destinoDeTipo,
  textoDelUso,
  type ClaveDeGrupo,
  type TipoDeDocumento,
} from '../../../entities/documentos/tipo-de-documento'
import {
  motivoDeSoloLectura,
  usoDe,
  type VistaDeGrupo,
} from '../../../entities/documentos/vista-de-grupo'
import { accionesDeTipo, type QuehaceresDeTipo } from './acciones-de-tipo'

// Lo que se dice del vencimiento junto al nombre, con texto: «Renueva cada 365 días», «Pide fecha». Sin vencimiento no se dice nada.
export function textoDelVencimiento(tipo: TipoDeDocumento): string | null {
  if (tipo.modo === 'renovar' && tipo.vigenciaDias !== null) {
    return tipo.vigenciaDias === 1
      ? 'Renueva cada día'
      : `Renueva cada ${String(tipo.vigenciaDias)} días`
  }
  return tipo.modo === 'solicitar' ? 'Pide fecha' : null
}

function insignias(tipo: TipoDeDocumento): string[] {
  const vence = textoDelVencimiento(tipo)
  return [...(vence === null ? [] : [vence]), ...(tipo.visiblePortal ? ['Portal'] : [])]
}

// Los tipos de un grupo como filas de la lista de catálogo, en su orden. En un grupo de sólo lectura el orden se apaga con el motivo del permiso
// (no con «Ya es el primero»), «Editar» queda apagada y el uso no se muestra: sólo lo sabe quien puede cambiar el grupo.
export function filasDeTipos(
  vista: VistaDeGrupo,
  clave: ClaveDeGrupo,
  quehaceres: QuehaceresDeTipo,
): FilaDeCatalogo[] {
  const { grupo, puedeCambiar } = vista
  return grupo.tipos.map((tipo) => {
    const uso = usoDe(vista, tipo)
    return {
      id: tipo.id,
      nombre: tipo.nombre,
      icono: null,
      activo: tipo.activo,
      insignias: insignias(tipo),
      uso: puedeCambiar && uso ? textoDelUso(uso) : '—',
      acciones: accionesDeTipo(tipo, { clave, puedeCambiar, uso }, quehaceres),
      puedeSubir: puedeCambiar && destinoDeTipo(grupo.tipos, tipo.id, 'subir') !== null,
      puedeBajar: puedeCambiar && destinoDeTipo(grupo.tipos, tipo.id, 'bajar') !== null,
      ...(puedeCambiar ? {} : { motivoSinOrden: motivoDeSoloLectura(clave) }),
    }
  })
}
