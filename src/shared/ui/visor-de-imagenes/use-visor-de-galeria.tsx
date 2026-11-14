'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { useAbiertoAlgunaVez } from '../use-abierto-alguna-vez'
import { usePanelPorUrl } from '../use-panel-por-url'
import { indiceDeLaUrl, type ImagenDelVisor } from './tipos'
import { CLAVE_DEL_VISOR } from './use-carrusel'
import { VisorDeImagenes } from './visor-de-imagenes'

const CLAVE_DE_LA_FOTO = 'foto'

// El visor de una galería que ya tiene sus imágenes leídas (la pestaña «Fotos», las imágenes de un ítem): cada miniatura llama `abrir(i)` y el
// visor se abre en esa, con la URL (`?visor=<clave>&foto=<n>`). La `clave` no puede ser la de un carrusel de la misma pantalla.
export function useVisorDeGaleria(
  clave: string,
  titulo: string,
  imagenes: readonly ImagenDelVisor[],
) {
  const visor = usePanelPorUrl(clave, [CLAVE_DE_LA_FOTO], { clave: CLAVE_DEL_VISOR })
  const montar = useAbiertoAlgunaVez(visor.abierto)
  const [, ponerFoto] = useQueryState(
    CLAVE_DE_LA_FOTO,
    parseAsString.withOptions({ history: 'replace' }),
  )
  return {
    abrir: (indice: number) => {
      visor.abrir({ [CLAVE_DE_LA_FOTO]: String(indice + 1) })
    },
    visor: montar ? (
      <VisorDeImagenes
        abierto={visor.abierto}
        alCerrar={visor.cerrar}
        titulo={titulo}
        estado={{ estado: 'listas', imagenes }}
        actual={indiceDeLaUrl(visor.valor(CLAVE_DE_LA_FOTO), imagenes.length)}
        alIrA={(indice) => {
          void ponerFoto(String(indice + 1))
        }}
        alReintentar={() => undefined}
      />
    ) : null,
  }
}
