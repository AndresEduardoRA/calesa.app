'use client'

import { useState } from 'react'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { ComandoDelChat } from '../../../entities/menciones'

// Los paneles de `/tarea` y `/evento`, por URL (`?panel=tarea|evento`; no nombran `c`: abrir o cerrar uno no cierra el hilo). El título de partida
// (lo escrito tras el comando) vive en estado y no en la URL: recargar con el panel abierto lo abre vacío. Cada apertura es un formulario nuevo
// (`aperturas` va de `key`): lo escrito antes no vuelve y el intento tiene su propio `id`.
export function usePanelesDeFicha() {
  const tarea = usePanelPorUrl('tarea')
  const evento = usePanelPorUrl('evento')
  const [titulo, setTitulo] = useState('')
  const [aperturas, setAperturas] = useState(0)

  function alComando(comando: ComandoDelChat, resto: string) {
    setTitulo(resto)
    setAperturas((n) => n + 1)
    if (comando === 'tarea') {
      tarea.abrir()
    } else {
      evento.abrir()
    }
  }

  return { tarea, evento, titulo, aperturas, alComando }
}
