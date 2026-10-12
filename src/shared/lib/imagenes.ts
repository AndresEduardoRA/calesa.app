// Imágenes antes de subir: se achican y se pasan a WebP en el navegador (el límite del body es de
// 2 MB y nadie necesita 12 megapíxeles en una tarjeta). Los documentos NO pasan por acá: se
// suben tal cual. Sólo corre en el navegador.

export const LADO_MAXIMO_FOTO = 1600
const CALIDAD_WEBP = 0.82

export type Dimensiones = { ancho: number; alto: number }

// Achica conservando la proporción; nunca agranda.
export function dimensionesAjustadas(original: Dimensiones, ladoMaximo: number): Dimensiones {
  const mayor = Math.max(original.ancho, original.alto)
  if (mayor <= ladoMaximo || mayor === 0) {
    return original
  }
  const escala = ladoMaximo / mayor
  return {
    ancho: Math.max(1, Math.round(original.ancho * escala)),
    alto: Math.max(1, Math.round(original.alto * escala)),
  }
}

// WebP para fotos (con pérdida, pesa poco). PNG para lo que no tolera pérdida ni perder la
// transparencia: un logo.
export type FormatoDeSalida = 'image/webp' | 'image/png'

export async function comprimirImagen(
  archivo: Blob,
  ladoMaximo: number = LADO_MAXIMO_FOTO,
  formato: FormatoDeSalida = 'image/webp',
): Promise<Blob> {
  // `from-image` respeta la orientación EXIF: una foto de celular no sale acostada.
  const mapa = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  try {
    const { ancho, alto } = dimensionesAjustadas(
      { ancho: mapa.width, alto: mapa.height },
      ladoMaximo,
    )
    const lienzo = document.createElement('canvas')
    lienzo.width = ancho
    lienzo.height = alto
    const contexto = lienzo.getContext('2d')
    if (!contexto) {
      throw new Error('El navegador no pudo preparar la imagen.')
    }
    contexto.drawImage(mapa, 0, 0, ancho, alto)
    return await new Promise<Blob>((resolver, rechazar) => {
      lienzo.toBlob(
        (resultado) => {
          if (resultado) {
            resolver(resultado)
          } else {
            rechazar(new Error('El navegador no pudo convertir la imagen.'))
          }
        },
        formato,
        // PNG no tiene calidad: es sin pérdida y el navegador ignora el argumento.
        CALIDAD_WEBP,
      )
    })
  } finally {
    mapa.close()
  }
}

// Nombre del objeto en Storage: el SHA-256 de su contenido. La misma foto subida dos veces es un
// solo objeto, y un objeto nunca cambia de contenido (se puede cachear para siempre).
export async function hashDe(contenido: Blob): Promise<string> {
  const resumen = await crypto.subtle.digest('SHA-256', await contenido.arrayBuffer())
  return [...new Uint8Array(resumen)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
