'use client'

import type { Route } from 'next'
import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Confirmar } from '@/shared/ui/confirmar'
import { avisarExito } from '@/shared/ui/toasts'
import {
  RUTA_DE_LA_LISTA_DE_GUIAS,
  rutasDeImagenes,
  type GuiaCompleta,
} from '../../../../entities/contenido/guias'
import { eliminarGuia } from '../actions/eliminar-guia'
import { quitarImagenesHuerfanas } from '../hooks/quitar-imagenes-huerfanas'
import { useEliminarGuiaPorUrl } from '../hooks/use-eliminar-guia-por-url'

const MENSAJE_DE_VALIDACION = 'No se pudo eliminar la guía. Recarga la página.'

// «Eliminar guía» (`?eliminar=guia`; irreversible: pide confirmar y nombra la guía). Un rechazo o un conflicto se dice dentro del diálogo. Al
// eliminar, vuelve a la lista y retira del bucket las imágenes y la portada que ninguna otra guía use.
export function ConfirmarEliminarGuia({ guia }: { guia: GuiaCompleta }) {
  const router = useRouter()
  const eliminar = useAction(eliminarGuia)
  const url = useEliminarGuiaPorUrl()
  const [error, setError] = useState<string | null>(null)

  async function confirmar() {
    const envio = await enviarAccion(
      eliminar.executeAsync({ id: guia.id, actualizadoEnEsperado: guia.actualizadoEn }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      setError(envio.error.mensaje)
      return
    }
    quitarImagenesHuerfanas(
      [...rutasDeImagenes(guia.cuerpoDoc), ...(guia.portadaRuta ? [guia.portadaRuta] : [])],
      [],
    )
    avisarExito('Guía eliminada')
    router.push(RUTA_DE_LA_LISTA_DE_GUIAS as Route)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 text-(--color-peligro-ink) md:min-h-9"
        onClick={() => {
          setError(null)
          url.abrir()
        }}
      >
        Eliminar guía
      </Button>
      <Confirmar
        abierto={url.abierto}
        alCerrar={url.cerrar}
        alConfirmar={confirmar}
        titulo={`Eliminar la guía «${guia.titulo}»`}
        descripcion="Sale de la web si estaba publicada y se borran sus imágenes. No se puede deshacer."
        etiquetaConfirmar="Eliminar guía"
        enCurso={eliminar.isPending}
      >
        {error ? (
          <Aviso tono="peligro">
            <p>{error}</p>
          </Aviso>
        ) : null}
      </Confirmar>
    </>
  )
}
