'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { CategoriaDeGuia } from '../../../../entities/contenido/categorias'
import { crearCategoria } from '../actions/crear-categoria'
import { renombrarCategoria } from '../actions/renombrar-categoria'

export const REVISA_LA_CATEGORIA = 'No se pudo guardar. Recarga la página.'

// El nombre que se escribe en el panel: agrega una categoría o renombra la que se eligió. Un error de nombre (vacío, repetido, sin letras) va
// junto al campo; el resto, un aviso. Lo escrito queda siempre que algo falla.
export function useNombreDeCategoria() {
  const crear = useAction(crearCategoria)
  const renombrar = useAction(renombrarCategoria)
  const [nombre, setNombre] = useState('')
  const [editando, setEditando] = useState<CategoriaDeGuia | null>(null)
  const [error, setError] = useState<string | undefined>(undefined)

  async function enviar(): Promise<void> {
    setError(undefined)
    if (nombre.trim() === '') {
      setError('Escribe el nombre de la categoría.')
      return
    }
    const envio = editando
      ? await enviarAccion(renombrar.executeAsync({ id: editando.id, nombre }), REVISA_LA_CATEGORIA)
      : await enviarAccion(crear.executeAsync({ nombre }), REVISA_LA_CATEGORIA)
    if (envio.ok) {
      avisarExito(editando ? 'Categoría renombrada' : 'Categoría agregada')
      setNombre('')
      setEditando(null)
      return
    }
    const delCampo = 'porCampo' in envio ? envio.porCampo?.['nombre'] : undefined
    if (delCampo) {
      setError(delCampo)
    } else if (envio.error.codigo === 'validacion') {
      setError(envio.error.mensaje)
    } else {
      avisarError(envio.error)
    }
  }

  return {
    nombre,
    cambiar: (texto: string) => {
      setNombre(texto)
      setError(undefined)
    },
    editando,
    empezarARenombrar: (categoria: CategoriaDeGuia) => {
      setEditando(categoria)
      setNombre(categoria.nombre)
      setError(undefined)
    },
    cancelar: () => {
      setEditando(null)
      setNombre('')
      setError(undefined)
    },
    error,
    enviar,
    enCurso: crear.isPending || renombrar.isPending,
  }
}
