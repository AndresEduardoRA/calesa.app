'use client'

import { useState } from 'react'
import { motivoParaNoEliminarCategoria, type Categoria } from '../../../entities/categoria'
import type { EdicionesDeCategorias } from './use-categorias'

type Args = {
  // null = una categoría nueva.
  categoria: Categoria | null
  origenId: string
  hijas: readonly Categoria[]
  ediciones: EdicionesDeCategorias
  alTerminar: () => void
}

// El estado de crear o editar una categoría. Crear pide el nombre y un padre opcional; editar,
// el nombre o activarla y desactivarla. Eliminar pide una segunda pulsación, dentro del panel.
export function useFormularioDeCategoria({
  categoria,
  origenId,
  hijas,
  ediciones,
  alTerminar,
}: Args) {
  const [nombre, setNombre] = useState(categoria?.nombre ?? '')
  const [padreId, setPadreId] = useState('')
  const [activa, setActiva] = useState(categoria?.activa ?? true)
  const [errorDeNombre, setErrorDeNombre] = useState<string | undefined>(undefined)
  const [eliminando, setEliminando] = useState(false)

  async function guardar(): Promise<boolean> {
    setErrorDeNombre(undefined)
    let resultado
    if (categoria === null) {
      resultado = await ediciones.crear({
        origenId,
        nombre,
        padreId: padreId === '' ? null : padreId,
      })
    } else if (activa !== categoria.activa) {
      resultado = await ediciones.cambiarActiva(categoria, activa)
    } else {
      resultado = await ediciones.renombrar(categoria, nombre)
    }
    if (resultado.ok) {
      alTerminar()
      return true
    }
    if (resultado.error.codigo === 'duplicado') {
      setErrorDeNombre(resultado.error.mensaje)
    }
    return false
  }

  async function eliminar() {
    if (categoria && (await ediciones.eliminar(categoria)).ok) {
      alTerminar()
    } else {
      setEliminando(false)
    }
  }

  return {
    nombre,
    cambiarNombre: (valor: string) => {
      setNombre(valor)
      setErrorDeNombre(undefined)
    },
    padreId,
    setPadreId,
    activa,
    setActiva,
    errorDeNombre,
    eliminando,
    pedirEliminar: () => {
      setEliminando(true)
    },
    guardar,
    eliminar,
    motivoNoEliminar: categoria ? motivoParaNoEliminarCategoria(categoria, hijas) : null,
  }
}
