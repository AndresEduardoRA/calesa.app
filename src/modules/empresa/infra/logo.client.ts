import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { comprimirImagen, type Dimensiones } from '@/shared/lib/imagenes'
import { quitarSiHuerfano, subirPorHash } from '@/shared/lib/supabase/almacen.client'
import {
  CARPETA_DE_LOGOS,
  LADO_MAXIMO_LOGO,
  avisoDeLogoChico,
  extensionDeLogo,
  medidasDeSvg,
  motivoDeLogoInvalido,
  motivoDeLogoPesado,
  motivoDeSvgInvalido,
  type ExtensionDeLogo,
} from '../entities/marca'

export type LogoListo = {
  contenido: Blob
  extension: ExtensionDeLogo
  // No impide guardar: dice que los íconos van a salir borrosos.
  aviso: string | null
}

const NO_SE_PUDO_LEER = 'No se pudo leer esa imagen. Prueba con otra (SVG, PNG, WebP o JPEG).'

async function medidasDe(archivo: Blob): Promise<Dimensiones> {
  const mapa = await createImageBitmap(archivo)
  const medidas = { ancho: mapa.width, alto: mapa.height }
  mapa.close()
  return medidas
}

async function prepararSvg(archivo: File): Promise<Resultado<LogoListo>> {
  const texto = await archivo.text()
  const motivo = motivoDeSvgInvalido(texto) ?? (medidasDeSvg(texto) ? null : NO_SE_PUDO_LEER)
  return motivo
    ? fallo('validacion', motivo)
    : ok({ contenido: archivo, extension: 'svg', aviso: null })
}

// Revisa el archivo recién elegido y lo deja listo para subir, sin subir nada todavía: un SVG va
// tal cual; un raster de más de 1024 px se reduce a PNG (sin pérdida, conserva la transparencia).
export async function prepararLogo(archivo: File): Promise<Resultado<LogoListo>> {
  const extension = extensionDeLogo(archivo.type)
  const motivo = motivoDeLogoInvalido({ tipo: archivo.type, peso: archivo.size })
  if (motivo || !extension) {
    return fallo('validacion', motivo ?? NO_SE_PUDO_LEER)
  }
  try {
    if (extension === 'svg') {
      return await prepararSvg(archivo)
    }
    const medidas = await medidasDe(archivo)
    const grande = Math.max(medidas.ancho, medidas.alto) > LADO_MAXIMO_LOGO
    const contenido = grande
      ? await comprimirImagen(archivo, LADO_MAXIMO_LOGO, 'image/png')
      : archivo
    const pesado = motivoDeLogoPesado(contenido.size)
    if (pesado) {
      return fallo('validacion', pesado)
    }
    return ok({
      contenido,
      extension: grande ? 'png' : extension,
      aviso: avisoDeLogoChico(archivo.type, medidas),
    })
  } catch (error) {
    console.error('No se pudo preparar el logo', error)
    return fallo('validacion', NO_SE_PUDO_LEER)
  }
}

// Recién al guardar el formulario: `marca/logos/<hash>.<ext>`.
export async function subirLogo(logo: LogoListo): Promise<Resultado<{ ruta: string }>> {
  return subirPorHash({
    bucket: 'marca',
    carpeta: CARPETA_DE_LOGOS,
    contenido: logo.contenido,
    extension: logo.extension,
  })
}

// El logo anterior, o uno recién subido cuyos ajustes no se llegaron a guardar.
export async function descartarLogo(ruta: string): Promise<void> {
  await quitarSiHuerfano('marca', ruta)
}
