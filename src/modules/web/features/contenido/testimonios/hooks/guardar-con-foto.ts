import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import {
  descartarFotoDeTestimonio,
  subirFotoDeTestimonio,
} from '../../../../areas/contenido/client'
import type { Testimonio } from '../../../../entities/contenido/testimonios'
import {
  cambiosDeTestimonio,
  type DatosDeTestimonio,
} from '../../../../entities/contenido/testimonios-formulario'
import { crearTestimonio } from '../actions/crear-testimonio'
import { guardarTestimonio } from '../actions/guardar-testimonio'

const MENSAJE_DE_VALIDACION = 'Revisa los campos marcados.'

export type FotoElegida = { archivo: File | null; quitada: boolean }

// Sube la foto elegida (si hay), crea o guarda sólo lo que cambió y deja limpio el almacén según cómo salga: si el guardado falla se descarta lo recién subido
// y si reemplaza o quita la foto se descarta la anterior (`web_testimonios` no tiene trigger de limpieza; `quitarSiHuerfano` no borra lo que otra fila usa).
export async function guardarConFoto(
  original: Testimonio | null,
  datos: Omit<DatosDeTestimonio, 'fotoRuta'>,
  foto: FotoElegida,
): Promise<Envio<unknown>> {
  const rutaAnterior = original?.fotoRuta ?? null
  let fotoRuta = foto.quitada ? null : rutaAnterior
  let subida: string | null = null
  if (foto.archivo) {
    const subir = await subirFotoDeTestimonio(foto.archivo)
    if (!subir.ok) {
      return { ok: false, error: subir.error, porCampo: { foto: subir.error.mensaje } }
    }
    fotoRuta = subir.data.ruta
    subida = subir.data.ruta
  }
  const completos = { ...datos, fotoRuta }
  const cambios = original ? cambiosDeTestimonio(original, completos) : null
  const envio = await mandarLoQueCambio(original, completos, cambios)
  if (!envio.ok) {
    if (subida !== null && subida !== rutaAnterior) await descartarFotoDeTestimonio(subida)
  } else if (rutaAnterior !== null && rutaAnterior !== fotoRuta) {
    await descartarFotoDeTestimonio(rutaAnterior)
  }
  return envio
}

function mandarLoQueCambio(
  original: Testimonio | null,
  completos: DatosDeTestimonio,
  cambios: Partial<DatosDeTestimonio> | null,
): Promise<Envio<unknown>> | Envio<unknown> {
  if (original === null) {
    return enviarAccion(crearTestimonio(completos), MENSAJE_DE_VALIDACION)
  }
  if (cambios === null) {
    return { ok: true, data: original }
  }
  return enviarAccion(
    guardarTestimonio({
      id: original.id,
      actualizadoEnEsperado: original.actualizadoEn,
      cambios,
    }),
    MENSAJE_DE_VALIDACION,
  )
}
