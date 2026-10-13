'use client'

import { useRef } from 'react'
import type { Galeria } from '../../../entities/foto'
import { useGaleria } from '../hooks/use-galeria'
import { FotoDeGaleria } from './foto-de-galeria'

type Props = { vehiculoId: string; galeria: Galeria; puedeEditar: boolean }

// Las fotos guardadas, en su orden. Se reordenan con los botones de cada una o, con el foco en
// una foto, con Alt + ← y Alt + →. Arrastrar no: no anda con teclado ni bien en el celular.
export function GaleriaDeFotos({ vehiculoId, galeria, puedeEditar }: Props) {
  const ediciones = useGaleria(vehiculoId, galeria)
  const lista = useRef<HTMLUListElement>(null)
  return (
    <>
      <ul
        ref={lista}
        tabIndex={-1}
        aria-label="Fotos del vehículo"
        className="grid grid-cols-2 gap-3 outline-none sm:grid-cols-3 lg:grid-cols-4"
      >
        {galeria.fotos.map((foto) => (
          <FotoDeGaleria
            key={foto.id}
            foto={foto}
            total={galeria.fotos.length}
            ocupado={ediciones.enCurso}
            enfocar={ediciones.foco?.id === foto.id ? ediciones.foco.direccion : null}
            acciones={
              puedeEditar
                ? {
                    alMover: (direccion) => {
                      void ediciones.mover(foto, direccion)
                    },
                    alPonerDePortada: () => {
                      void ediciones.ponerDePortada(foto)
                    },
                    alEliminar: () => {
                      // El botón desaparece con la foto: el foco queda en la lista, no en la nada.
                      void ediciones.eliminar(foto).then((eliminada) => {
                        if (eliminada) {
                          lista.current?.focus()
                        }
                      })
                    },
                  }
                : null
            }
          />
        ))}
      </ul>
      <p role="status" aria-live="polite" className="sr-only">
        {ediciones.anuncio}
      </p>
    </>
  )
}
