'use client'

import { useEffect, useState } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Confirmar } from '@/shared/ui/confirmar'
import { avisarError } from '@/shared/ui/toasts'
import {
  MOTIVO_DE_CATEGORIA_AUSENTE,
  type CategoriaDeGuia,
} from '../../../../entities/contenido/categorias'
import { useEliminarCategoriaPorUrl } from '../hooks/use-eliminar-categoria-por-url'

const PREFIJO = 'categoria-de-guia'

// «Eliminar categoría» (`?eliminar=categoria`; irreversible: pide confirmar y nombra la categoría). El rechazo (tiene guías) se dice dentro del
// diálogo. Si la URL nombra una que ya no está, avisa y la cierra.
export function ConfirmarEliminarCategoria({
  filas,
  enCurso,
  alEliminar,
}: {
  filas: readonly CategoriaDeGuia[]
  enCurso: boolean
  alEliminar: (id: string) => Promise<string | null>
}) {
  const url = useEliminarCategoriaPorUrl(filas)
  const [error, setError] = useState<string | null>(null)
  const { ausente, cerrar } = url

  useEffect(() => {
    if (ausente) {
      avisarError({ codigo: 'no_encontrado', mensaje: MOTIVO_DE_CATEGORIA_AUSENTE })
      cerrar()
    }
  }, [ausente, cerrar])

  async function confirmar() {
    if (!url.categoria) {
      return
    }
    const motivo = await alEliminar(url.categoria.id)
    if (motivo === null) {
      setError(null)
      url.cerrar()
      return
    }
    setError(motivo)
  }

  return (
    <Confirmar
      abierto={url.abierto}
      alCerrar={() => {
        setError(null)
        url.cerrar()
      }}
      alConfirmar={confirmar}
      titulo={`Eliminar la categoría «${url.categoria?.nombre ?? ''}»`}
      descripcion="Las guías que la tengan quedarían sin categoría; por eso sólo se elimina una sin guías. No se puede deshacer."
      etiquetaConfirmar="Eliminar categoría"
      enCurso={enCurso}
      focoAlCerrar={() =>
        document.querySelector<HTMLElement>(
          `[data-mas-acciones="${PREFIJO}-${url.categoria?.id ?? ''}-mas"]`,
        ) ?? true
      }
    >
      {error ? (
        <Aviso tono="peligro">
          <p>{error}</p>
        </Aviso>
      ) : null}
    </Confirmar>
  )
}
