'use client'

import { useId, useSyncExternalStore } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { PANEL_BORRAR_COMENTARIO } from '../../../entities/comentarios/borrado'
import { useALaVista } from '../hooks/use-a-la-vista'
import { ComentariosDiferidos } from './diferidos'

function suscribir(alCambiar: () => void): () => void {
  window.addEventListener('popstate', alCambiar)
  return () => {
    window.removeEventListener('popstate', alCambiar)
  }
}

// Si se llegó con `?panel=borrar-comentario`: la lista se monta enseguida para abrir el diálogo.
const conBorradoEnLaUrl = () =>
  new URLSearchParams(window.location.search).get('panel') === PANEL_BORRAR_COMENTARIO

// La sección «Comentarios» bajo la hoja de una guardada (4.27-2, P1 a). Es chica: el título y un nodo que se observa; la lista (y su código) llega la primera vez que
// la sección está a la vista o si la URL ya trae el borrado de un comentario.
export function SeccionDeComentarios({ cotizacionId }: { cotizacionId: string }) {
  const titulo = useId()
  const [observar, visto] = useALaVista<HTMLElement>()
  const enLaUrl = useSyncExternalStore(suscribir, conBorradoEnLaUrl, () => false)
  const montada = useAbiertoAlgunaVez(visto || enLaUrl)
  return (
    <section ref={observar} aria-labelledby={titulo} className="grid min-w-0 gap-3">
      <h2 id={titulo} className="text-(length:--text-lg) font-semibold text-(--color-ink)">
        Comentarios
      </h2>
      {montada ? <ComentariosDiferidos cotizacionId={cotizacionId} /> : null}
    </section>
  )
}
