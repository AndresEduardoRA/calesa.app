'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { useEffect, useState } from 'react'
import { useAbiertoAlgunaVez } from '../use-abierto-alguna-vez'
import { usePanelPorUrl } from '../use-panel-por-url'
import { indiceDeLaUrl, vecina, type CargaDeImagenes } from './tipos'
import { useImagenes } from './use-imagenes'

// La clave de la URL del visor (`?visor=<clave>&foto=<n>`): aparte de `?panel=`, así se abre sobre un drawer o un panel sin cerrarlos.
export const CLAVE_DEL_VISOR = 'visor'
const CLAVE_DE_LA_FOTO = 'foto'

export type PedidoDelCarrusel = {
  // Única en la pantalla (el id de la entidad): nombra al visor en la URL.
  clave: string
  // El nombre de la entidad: el título del visor y el texto de cada foto.
  titulo: string
  // La miniatura de la portada que ya trae la fila (480 px); sin ella, no hay nada que mostrar ni que pedir.
  portada: string | null
  cargar: CargaDeImagenes
}

// El estado de un carrusel en su lugar y de su visor: qué foto se ve en el lugar, qué foto abre el visor (la de la URL) y las imágenes, pedidas
// recién al acercarse (`acercarse`: puntero o foco) o al abrir el visor desde la URL.
export function useCarrusel({ clave, portada, cargar }: PedidoDelCarrusel) {
  const { estado, imagenes, pedir } = useImagenes(cargar)
  const visor = usePanelPorUrl(clave, [CLAVE_DE_LA_FOTO], { clave: CLAVE_DEL_VISOR })
  const montarVisor = useAbiertoAlgunaVez(visor.abierto)
  // Pasar de foto dentro del visor reemplaza la entrada: «atrás» cierra el visor, no recorre las fotos.
  const [, ponerFoto] = useQueryState(
    CLAVE_DE_LA_FOTO,
    parseAsString.withOptions({ history: 'replace' }),
  )
  const [indice, setIndice] = useState(0)
  const total = imagenes?.length ?? 0

  // Abierto desde la URL (recargar, compartir): pide lo que falta.
  useEffect(() => {
    if (visor.abierto) pedir()
  }, [visor.abierto, pedir])

  const acercarse = () => {
    if (portada !== null) pedir()
  }
  return {
    indice,
    total,
    montarVisor,
    enLugar: imagenes?.[indice]?.miniatura ?? portada,
    // Antes de que lleguen se ofrecen igual (pueden ser varias); si llegó una sola, no.
    conFlechas: portada !== null && (imagenes === null || total > 1),
    acercarse,
    mover: (paso: 1 | -1) => {
      if (total > 1) setIndice((actual) => vecina(actual, total, paso))
      else acercarse()
    },
    abrir: () => {
      pedir()
      visor.abrir({ [CLAVE_DE_LA_FOTO]: String(indice + 1) })
    },
    visor: {
      abierto: visor.abierto,
      alCerrar: visor.cerrar,
      estado,
      actual: indiceDeLaUrl(visor.valor(CLAVE_DE_LA_FOTO), total),
      alIrA: (en: number) => {
        setIndice(en)
        void ponerFoto(String(en + 1))
      },
      alReintentar: pedir,
    },
  }
}
