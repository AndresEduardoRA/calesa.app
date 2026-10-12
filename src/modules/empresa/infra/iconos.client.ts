import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { quitarSiHuerfano, subirPorHash } from '@/shared/lib/supabase/almacen.client'
import {
  ICONOS,
  encuadreDeIcono,
  type ClaveDeIcono,
  type EspecificacionDeIcono,
  type Iconos,
} from '../entities/iconos'
import { medidasDeSvg, svgConMedidas } from '../entities/marca'

export type IconoDibujado = { clave: ClaveDeIcono; lado: number; contenido: Blob }

const NO_SE_PUDO_DIBUJAR = 'No se pudo dibujar el logo. Prueba cargarlo de nuevo en otro formato.'
const CARPETA = 'iconos'

// Un SVG sin `width` y `height` propios no se dibuja en un lienzo en todos los navegadores: se
// le ponen los de su `viewBox` antes de cargarlo.
async function conMedidasPropias(logo: Blob): Promise<Blob> {
  if (logo.type !== 'image/svg+xml') {
    return logo
  }
  const texto = await logo.text()
  const medidas = medidasDeSvg(texto)
  return medidas ? new Blob([svgConMedidas(texto, medidas)], { type: logo.type }) : logo
}

async function cargarLogo(url: string): Promise<HTMLImageElement> {
  const respuesta = await fetch(url)
  if (!respuesta.ok) {
    throw new Error(`El logo respondió ${respuesta.status}`)
  }
  const direccion = URL.createObjectURL(await conMedidasPropias(await respuesta.blob()))
  try {
    const imagen = new Image()
    imagen.src = direccion
    await imagen.decode()
    return imagen
  } finally {
    URL.revokeObjectURL(direccion)
  }
}

function dibujar(
  icono: EspecificacionDeIcono,
  logo: HTMLImageElement,
  fondo: string,
): Promise<Blob> {
  const lienzo = document.createElement('canvas')
  lienzo.width = icono.lado
  lienzo.height = icono.lado
  const contexto = lienzo.getContext('2d')
  if (!contexto) {
    throw new Error('El navegador no pudo preparar el lienzo.')
  }
  const encuadre = encuadreDeIcono(icono, { ancho: logo.naturalWidth, alto: logo.naturalHeight })
  contexto.fillStyle = fondo
  contexto.beginPath()
  contexto.roundRect(0, 0, icono.lado, icono.lado, encuadre.radio)
  contexto.fill()
  contexto.imageSmoothingQuality = 'high'
  const { x, y, ancho, alto } = encuadre.logo
  contexto.drawImage(logo, x, y, ancho, alto)
  return new Promise<Blob>((resolver, rechazar) => {
    lienzo.toBlob((resultado) => {
      if (resultado) {
        resolver(resultado)
      } else {
        rechazar(new Error('El navegador no pudo convertir el ícono.'))
      }
    }, 'image/png')
  })
}

// Dibuja los cinco íconos a partir del logo guardado, centrado sobre el fondo elegido. No sube
// nada: quien llama los muestra y, si la persona confirma, los sube.
export async function dibujarIconos(
  logoUrl: string,
  fondo: string,
): Promise<Resultado<IconoDibujado[]>> {
  try {
    const logo = await cargarLogo(logoUrl)
    const dibujados = await Promise.all(
      ICONOS.map(async (icono) => ({
        clave: icono.clave,
        lado: icono.lado,
        contenido: await dibujar(icono, logo, fondo),
      })),
    )
    return ok(dibujados)
  } catch (error) {
    console.error('No se pudieron dibujar los íconos', error)
    return fallo('inesperado', NO_SE_PUDO_DIBUJAR)
  }
}

// Sube los cinco a `marca/iconos/<hash>.png`. Si alguno falla, los que subieron se descartan: no
// queda nada a medias.
export async function subirIconos(dibujados: readonly IconoDibujado[]): Promise<Resultado<Iconos>> {
  const subidas = await Promise.all(
    dibujados.map(async (icono) => ({
      clave: icono.clave,
      subida: await subirPorHash({
        bucket: 'marca',
        carpeta: CARPETA,
        contenido: icono.contenido,
        extension: 'png',
      }),
    })),
  )
  const rutas = new Map<ClaveDeIcono, string>()
  for (const { clave, subida } of subidas) {
    if (subida.ok) {
      rutas.set(clave, subida.data.ruta)
    }
  }
  const [r32, r180, r192, r512, r512m] = ICONOS.map((icono) => rutas.get(icono.clave))
  if (!r32 || !r180 || !r192 || !r512 || !r512m) {
    await descartarIconos([...rutas.values()])
    return fallo('inesperado', 'No se pudieron subir los íconos. Prueba de nuevo.')
  }
  return ok({ '32': r32, '180': r180, '192': r192, '512': r512, '512m': r512m })
}

// Los anteriores, o unos recién subidos cuyos ajustes no se llegaron a guardar. Sólo se borra lo
// que ya nadie referencia.
export async function descartarIconos(rutas: readonly string[]): Promise<void> {
  await Promise.all([...new Set(rutas)].map((ruta) => quitarSiHuerfano('marca', ruta)))
}
