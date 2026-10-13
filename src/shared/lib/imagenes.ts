// Imágenes antes de subir: se achican y se pasan a WebP en el navegador (nadie necesita 12
// megapíxeles en una tarjeta). Los documentos NO pasan por acá: se suben tal cual. Sólo corre en
// el navegador.

export const LADO_MAXIMO_FOTO = 1600
const CALIDAD = 0.82

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

export type ExtensionDeImagen = 'webp' | 'jpg' | 'png'

const EXTENSION_POR_TIPO: Record<string, ExtensionDeImagen> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

// La extensión de lo que de verdad salió del navegador (el `type` del blob), no de lo pedido.
export function extensionDe(tipo: string): ExtensionDeImagen | null {
  return EXTENSION_POR_TIPO[tipo] ?? null
}

// Un navegador que no sabe codificar el formato pedido no falla: devuelve PNG sin avisar (Safari
// con WebP). Un PNG de una foto pesa varios megas, así que ahí se vuelve a pedir en JPEG.
export function convieneJpeg(pedido: FormatoDeSalida, obtenido: string): boolean {
  return pedido === 'image/webp' && obtenido !== 'image/webp'
}

type Fuente = ImageBitmap | HTMLCanvasElement

function lienzoDe(fuente: Fuente, medidas: Dimensiones, fondo?: string): HTMLCanvasElement {
  const lienzo = document.createElement('canvas')
  lienzo.width = medidas.ancho
  lienzo.height = medidas.alto
  const contexto = lienzo.getContext('2d')
  if (!contexto) {
    throw new Error('El navegador no pudo preparar la imagen.')
  }
  if (fondo) {
    contexto.fillStyle = fondo
    contexto.fillRect(0, 0, medidas.ancho, medidas.alto)
  }
  contexto.imageSmoothingQuality = 'high'
  contexto.drawImage(fuente, 0, 0, medidas.ancho, medidas.alto)
  return lienzo
}

function aBlob(lienzo: HTMLCanvasElement, tipo: string): Promise<Blob> {
  return new Promise<Blob>((resolver, rechazar) => {
    lienzo.toBlob(
      (resultado) => {
        if (resultado) {
          resolver(resultado)
        } else {
          rechazar(new Error('El navegador no pudo convertir la imagen.'))
        }
      },
      tipo,
      // PNG no tiene calidad: es sin pérdida y el navegador ignora el argumento.
      CALIDAD,
    )
  })
}

async function codificar(lienzo: HTMLCanvasElement, formato: FormatoDeSalida): Promise<Blob> {
  const salida = await aBlob(lienzo, formato)
  if (!convieneJpeg(formato, salida.type)) {
    return salida
  }
  // JPEG no tiene transparencia: lo transparente saldría negro, así que va sobre blanco.
  const medidas = { ancho: lienzo.width, alto: lienzo.height }
  return aBlob(lienzoDe(lienzo, medidas, '#ffffff'), 'image/jpeg')
}

export type ImagenLista = Dimensiones & { contenido: Blob }

// La misma imagen en varios tamaños, decodificándola una sola vez (lo caro en un celular). Cada
// tamaño se dibuja desde el anterior, de mayor a menor: achicar de a pasos conserva más detalle.
// Devuelve una por lado pedido, en el orden en que se pidieron.
export async function comprimirEnTamanos(
  archivo: Blob,
  lados: readonly number[],
  formato: FormatoDeSalida = 'image/webp',
): Promise<ImagenLista[]> {
  // `from-image` respeta la orientación EXIF: una foto de celular no sale acostada.
  const mapa = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  try {
    const original = { ancho: mapa.width, alto: mapa.height }
    const porLado = new Map<number, ImagenLista>()
    let fuente: Fuente = mapa
    for (const lado of [...new Set(lados)].sort((a, b) => b - a)) {
      const medidas = dimensionesAjustadas(original, lado)
      const lienzo = lienzoDe(fuente, medidas)
      porLado.set(lado, { ...medidas, contenido: await codificar(lienzo, formato) })
      fuente = lienzo
    }
    return lados.flatMap((lado) => porLado.get(lado) ?? [])
  } finally {
    mapa.close()
  }
}

export async function comprimirImagen(
  archivo: Blob,
  ladoMaximo: number = LADO_MAXIMO_FOTO,
  formato: FormatoDeSalida = 'image/webp',
): Promise<Blob> {
  const [imagen] = await comprimirEnTamanos(archivo, [ladoMaximo], formato)
  if (!imagen) {
    throw new Error('El navegador no pudo preparar la imagen.')
  }
  return imagen.contenido
}

// Nombre del objeto en Storage: el SHA-256 de su contenido. La misma foto subida dos veces es un
// solo objeto, y un objeto nunca cambia de contenido (se puede cachear para siempre).
export async function hashDe(contenido: Blob): Promise<string> {
  const resumen = await crypto.subtle.digest('SHA-256', await contenido.arrayBuffer())
  return [...new Uint8Array(resumen)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
