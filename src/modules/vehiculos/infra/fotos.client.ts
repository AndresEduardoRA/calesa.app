import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import {
  LADO_MAXIMO_FOTO,
  comprimirEnTamanos,
  extensionDe,
  hashDe,
  type ImagenLista,
} from '@/shared/lib/imagenes'
import { subirPorHash } from '@/shared/lib/supabase/almacen.client'
import { LADO_DE_MINIATURA, type FotoSubida } from '../entities/foto'
import { mensajeDeRechazo, motivoDeLectura } from '../entities/seleccion-de-fotos'

// Una foto lista para subir: nada tocó Storage todavía. La miniatura sirve además de vista previa.
export type FotoPreparada = {
  // El SHA-256 del archivo original: por él se detecta la misma foto.
  hash: string
  completa: ImagenLista
  miniatura: ImagenLista
}

// Lee el archivo una sola vez y deja sus dos tamaños. Si el navegador no puede decodificarlo
// (un HEIC fuera de Safari, un archivo dañado), lo dice con su motivo.
export async function prepararFoto(archivo: File): Promise<Resultado<FotoPreparada>> {
  try {
    const [hash, tamanos] = await Promise.all([
      hashDe(archivo),
      comprimirEnTamanos(archivo, [LADO_MAXIMO_FOTO, LADO_DE_MINIATURA]),
    ])
    const [completa, miniatura] = tamanos
    if (!completa || !miniatura) {
      throw new Error('El navegador no devolvió los dos tamaños.')
    }
    return ok({ hash, completa, miniatura })
  } catch (error) {
    console.error('No se pudo preparar la foto', error)
    const motivo = motivoDeLectura({ nombre: archivo.name, tipo: archivo.type })
    return fallo('validacion', mensajeDeRechazo(motivo))
  }
}

async function subir(
  vehiculoId: string,
  imagen: ImagenLista,
): Promise<Resultado<{ ruta: string }>> {
  const extension = extensionDe(imagen.contenido.type)
  if (extension !== 'webp' && extension !== 'jpg') {
    return fallo('inesperado', 'No se pudo subir el archivo. Prueba de nuevo.')
  }
  // La carpeta es el vehículo: la policy de Storage mira si quien sube lo puede editar.
  return subirPorHash({
    bucket: 'vehiculos',
    carpeta: vehiculoId,
    contenido: imagen.contenido,
    extension,
  })
}

// Sube los dos objetos de una foto. Subir de nuevo lo que ya está no es un error (el nombre es el
// hash del contenido): por eso reintentar es inocuo.
export async function subirFoto(
  vehiculoId: string,
  foto: FotoPreparada,
): Promise<Resultado<FotoSubida>> {
  const [completa, miniatura] = await Promise.all([
    subir(vehiculoId, foto.completa),
    subir(vehiculoId, foto.miniatura),
  ])
  if (!completa.ok) {
    return completa
  }
  if (!miniatura.ok) {
    return miniatura
  }
  return ok({
    hash: foto.hash,
    ruta: completa.data.ruta,
    rutaMiniatura: miniatura.data.ruta,
    ancho: foto.completa.ancho,
    alto: foto.completa.alto,
    bytes: foto.completa.contenido.size,
  })
}
