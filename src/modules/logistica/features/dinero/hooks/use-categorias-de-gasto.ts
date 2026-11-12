'use client'

import { useCallback, useEffect, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { fallo, type ErrorApp } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import {
  leerCategoriasDeConfiguracion,
  NO_SE_CARGARON_LAS_CATEGORIAS,
} from '../../../areas/dinero/composicion.client'
import type { CategoriaDeGasto } from '../../../entities/dinero/categoria'
import { eliminarCategoria } from '../actions/eliminar-categoria'
import { guardarCategoria } from '../actions/guardar-categoria'

export type LecturaDeCategorias =
  | { tipo: 'cargando' }
  | { tipo: 'error'; error: ErrorApp }
  | { tipo: 'listo'; categorias: CategoriaDeGasto[] }

// Las categorías de gasto de Configuración (6.11-4): se leen al montar y otra vez tras cada escritura (la lista nunca queda vieja). `activar` y `eliminar` escriben por su Server Action; `eliminar`
// devuelve el motivo si la base no lo dejó (una con gastos no se borra) para que el diálogo lo diga.
export function useCategoriasDeGasto() {
  const [lectura, setLectura] = useState<LecturaDeCategorias>({ tipo: 'cargando' })

  const leer = useCallback(() => {
    let vigente = true
    void leerCategoriasDeConfiguracion()
      .catch(() => fallo('inesperado', NO_SE_CARGARON_LAS_CATEGORIAS))
      .then((resultado) => {
        if (vigente) {
          setLectura(
            resultado.ok
              ? { tipo: 'listo', categorias: resultado.data }
              : { tipo: 'error', error: resultado.error },
          )
        }
      })
    return () => {
      vigente = false
    }
  }, [])

  useEffect(() => leer(), [leer])

  return {
    lectura,
    recargar: () => {
      leer()
    },
    reintentar: () => {
      setLectura({ tipo: 'cargando' })
      leer()
    },
    activar: async (categoria: CategoriaDeGasto, activo: boolean) => {
      const envio = await enviarAccion(
        guardarCategoria({
          id: categoria.id,
          nombre: categoria.nombre,
          cambios: { activo },
        }),
        'No se pudo guardar la categoría.',
      )
      if (envio.ok) {
        avisarExito(activo ? 'Categoría activada.' : 'Categoría desactivada.')
        leer()
      } else {
        avisarError(envio.error)
      }
    },
    eliminar: async (categoria: CategoriaDeGasto): Promise<ErrorApp | null> => {
      const envio = await enviarAccion(
        eliminarCategoria({ id: categoria.id, nombre: categoria.nombre }),
        'No se pudo eliminar la categoría.',
      )
      if (envio.ok) {
        avisarExito('Categoría eliminada.')
        leer()
        return null
      }
      return envio.error
    },
  }
}
