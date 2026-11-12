'use client'

import { useCallback, useRef, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { LADO_MAXIMO_FOTO, comprimirEnTamanos, extensionDe } from '@/shared/lib/imagenes'
import { subirPorHash } from '@/shared/lib/supabase/almacen.client'
import { avisar, avisarError, avisarExito } from '@/shared/ui/toasts'
import { MENSAJE_ITEM_LLENO, avisoDeAgregado, lugarPara } from '../../../entities/items/imagenes'
import type { ResultadoDeAgregar } from '../../../entities/items/imagenes-repositorio'
import { agregarImagenes } from '../actions/agregar-imagenes'

const SUBIDAS_A_LA_VEZ = 3
const NO_SE_PUDO_SUBIR = 'No se pudo subir.'

type Args = {
  itemId: string
  // Cuántas imágenes tiene ya el ítem: el tope se calcula con esto.
  cuantas: number
  alAgregar: (resultado: ResultadoDeAgregar) => void
}

// Achica a WebP de ≤ 1600 px, nombra por el hash del resultado y sube a `repuestos/<ítem>/<hash>.webp`. Devuelve la ruta, o nulo si no se pudo leer o subir (no frena a las demás).
async function subirUna(itemId: string, archivo: File): Promise<string | null> {
  try {
    const [imagen] = await comprimirEnTamanos(archivo, [LADO_MAXIMO_FOTO])
    const extension = imagen ? extensionDe(imagen.contenido.type) : null
    if (!imagen || extension === null) {
      return null
    }
    const subida = await subirPorHash({
      bucket: 'repuestos',
      carpeta: itemId,
      contenido: imagen.contenido,
      extension,
    })
    return subida.ok ? subida.data.ruta : null
  } catch {
    return null
  }
}

// De a `aLaVez` a la vez, en el orden de los archivos.
async function enTandas(itemId: string, archivos: readonly File[]): Promise<(string | null)[]> {
  const rutas = new Array<string | null>(archivos.length).fill(null)
  let siguiente = 0
  async function trabajar(): Promise<void> {
    while (siguiente < archivos.length) {
      const indice = siguiente
      siguiente += 1
      const archivo = archivos[indice]
      if (archivo !== undefined) {
        rutas[indice] = await subirUna(itemId, archivo)
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(SUBIDAS_A_LA_VEZ, archivos.length)) }, trabajar),
  )
  return rutas
}

// Elegir archivos sube al momento (8.09-3, C9, D69): el panel es chico (≤ 8). Los primeros que caben se suben de a tres; lo que sobra se dice antes de subir. Con lo que subió se llama
// UNA `agregarImagenes`. Mismo archivo, misma imagen: lo repetido vuelve en `repetidas` y se dice «ya estaba» (C10).
export function useSubidaDeImagenes({ itemId, cuantas, alAgregar }: Args) {
  const [enCurso, setEnCurso] = useState(false)
  const ocupado = useRef(false)

  const subir = useCallback(
    async (archivos: readonly File[]) => {
      if (archivos.length === 0 || ocupado.current) {
        return
      }
      const lugar = lugarPara(cuantas)
      if (lugar === 0) {
        avisar(MENSAJE_ITEM_LLENO)
        return
      }
      const tomados = archivos.slice(0, lugar)
      if (tomados.length < archivos.length) {
        avisar(`Entran ${lugar} más: quedan fuera ${archivos.length - tomados.length}.`)
      }
      ocupado.current = true
      setEnCurso(true)
      try {
        const rutas = await enTandas(itemId, tomados)
        const subidas = rutas.filter((ruta) => ruta !== null)
        const fallidas = tomados.length - subidas.length
        if (subidas.length > 0) {
          const envio = await enviarAccion(
            agregarImagenes({ itemId, rutas: subidas }),
            'No se pudieron guardar las imágenes.',
          )
          if (envio.ok) {
            alAgregar(envio.data)
            avisarExito(avisoDeAgregado(envio.data))
          } else {
            avisarError(envio.error)
          }
        }
        if (fallidas > 0) {
          avisarError({
            codigo: 'inesperado',
            mensaje:
              fallidas === 1
                ? `${NO_SE_PUDO_SUBIR} Una imagen no se pudo leer o subir.`
                : `${NO_SE_PUDO_SUBIR} ${fallidas} imágenes no se pudieron leer o subir.`,
          })
        }
      } finally {
        ocupado.current = false
        setEnCurso(false)
      }
    },
    [alAgregar, cuantas, itemId],
  )

  return { subir, enCurso }
}
