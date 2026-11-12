'use client'

import { useCallback, useMemo, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisar, avisarConDeshacer, avisarError } from '@/shared/ui/toasts'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { MENSAJE_IMAGEN_YA_NO_ESTA, type ImagenDeItem } from '../../../entities/items/imagenes'
import type { ResultadoDeAgregar } from '../../../entities/items/imagenes-repositorio'
import { agregarImagenes } from '../actions/agregar-imagenes'
import { leerImagenesDeItem } from '../actions/leer-imagenes-de-item'
import { quitarImagen } from '../actions/quitar-imagen'

const NO_SE_QUITO = 'No se pudo quitar la imagen.'
const NO_SE_DESHIZO = 'No se pudo deshacer. Vuelve a subir la imagen.'

// Las imágenes del ítem que muestra el panel (8.09-3, C5, C13): se leen al abrirlo (nunca con la hoja, D64), con «Reintentar» si falla; agregar reemplaza la lista por la que devuelve el servidor;
// quitar la saca y ofrece «Deshacer», que vuelve a registrar su ruta (la base la rescata de la cola de limpieza). El panel se remonta en cada apertura, así que esto empieza de cero.
export function useImagenesDeItem(itemId: string) {
  const { lectura, reintentar } = useLecturaAlMontar(async () => {
    const envio = await enviarAccion(
      leerImagenesDeItem({ itemId }),
      'No se pudieron cargar las imágenes.',
    )
    return envio
  }, itemId)
  const [cambiadas, setCambiadas] = useState<readonly ImagenDeItem[] | null>(null)
  const [quitando, setQuitando] = useState<string | null>(null)
  const base = useMemo(() => (lectura.estado === 'leido' ? lectura.dato : []), [lectura])
  const imagenes = cambiadas ?? base

  const alAgregar = useCallback((resultado: ResultadoDeAgregar) => {
    setCambiadas(resultado.imagenes)
  }, [])

  const deshacer = useCallback(
    async (ruta: string) => {
      const envio = await enviarAccion(agregarImagenes({ itemId, rutas: [ruta] }), NO_SE_DESHIZO)
      if (envio.ok) {
        alAgregar(envio.data)
      } else {
        avisarError(envio.error)
      }
    },
    [alAgregar, itemId],
  )

  const quitar = useCallback(
    async (imagen: ImagenDeItem): Promise<boolean> => {
      setQuitando(imagen.id)
      const envio = await enviarAccion(quitarImagen({ imagenId: imagen.id }), NO_SE_QUITO)
      setQuitando(null)
      if (!envio.ok) {
        avisarError(envio.error)
        return false
      }
      setCambiadas((antes) => (antes ?? base).filter((i) => i.id !== imagen.id))
      const ruta = envio.data.ruta
      if (ruta === null) {
        avisar(MENSAJE_IMAGEN_YA_NO_ESTA)
      } else {
        avisarConDeshacer('Imagen quitada', () => void deshacer(ruta))
      }
      return true
    },
    [base, deshacer],
  )

  return { lectura, reintentar, imagenes, alAgregar, quitar, quitando }
}
