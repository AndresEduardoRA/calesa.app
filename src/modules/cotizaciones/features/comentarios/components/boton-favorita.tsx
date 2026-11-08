'use client'

import { StarIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { buttonVariants } from '@/shared/ui/button'
import { avisarError } from '@/shared/ui/toasts'
import { ponerFavorita } from '../actions/poner-favorita'

const NO_SE_MARCO = 'No se pudo cambiar la favorita.'

// «Favorita» (4.27-4): una marca privada de quien mira. Cambia al tocar, antes de que responda la base; la respuesta manda y, si falla, vuelve a como estaba y lo
// avisa. Un `<button>` con las clases de `<Button>` (sin el primitivo de Base UI): el JS en frío de la guardada está cerca de su tope.
export function BotonFavorita({
  cotizacionId,
  favorita,
}: {
  cotizacionId: string
  favorita: boolean
}) {
  const [marcada, setMarcada] = useState(favorita)
  const [leida, setLeida] = useState(favorita)
  // Lo que trae una lectura nueva de la página (otra pestaña la cambió y se recargó) reemplaza lo de aquí.
  if (favorita !== leida) {
    setLeida(favorita)
    setMarcada(favorita)
  }
  // El último toque manda: una respuesta vieja no pisa lo que se tocó después.
  const ultimo = useRef(0)

  async function alternar() {
    const antes = marcada
    const valor = !antes
    const toque = ++ultimo.current
    setMarcada(valor)
    const resultado = await enviarAccion(ponerFavorita({ cotizacionId, valor }), NO_SE_MARCO)
    if (toque !== ultimo.current) {
      return
    }
    if (resultado.ok) {
      setMarcada(resultado.data.valor)
    } else {
      setMarcada(antes)
      avisarError(resultado.error)
    }
  }

  return (
    <button
      type="button"
      aria-label="Favorita"
      aria-pressed={marcada}
      title={marcada ? 'Quitar de favoritas' : 'Marcar como favorita'}
      className={buttonVariants({
        variant: 'outline',
        size: 'icon',
        className: 'min-h-11 min-w-11 md:min-h-9 md:min-w-9',
      })}
      onClick={() => {
        void alternar()
      }}
    >
      <StarIcon aria-hidden className={marcada ? 'fill-current' : undefined} />
    </button>
  )
}
