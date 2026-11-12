'use client'

import { useRef, useState } from 'react'
import type { Buscar, OpcionDelBuscador, PropsDelBuscador } from './tipos-del-buscador'
import { useBusquedaCancelable } from './use-busqueda-cancelable'

type Args = {
  buscar: Buscar
  interpretar: (texto: string) => string | null
  alElegir: PropsDelBuscador['alElegir']
}

// El estado de un buscador con lista: lo escrito, la opción activa, si la lista está abierta y la búsqueda (`useBusquedaCancelable`). Elegir limpia lo escrito y cierra.
export function useEstadoDelBuscador({ buscar, interpretar, alElegir }: Args) {
  const [texto, setTexto] = useState('')
  const [activa, setActiva] = useState(0)
  const [abierta, setAbierta] = useState(false)
  const [intento, setIntento] = useState(0)
  const entrada = useRef<HTMLInputElement>(null)
  const interpretado = interpretar(texto)
  const { estado, reiniciar } = useBusquedaCancelable({ texto: interpretado, buscar, intento })
  const opciones = estado.tipo === 'listo' ? estado.opciones : []
  return {
    texto,
    activa,
    estado,
    interpretado,
    opciones,
    entrada,
    hayLista: abierta && opciones.length > 0,
    mover: setActiva,
    abrir: () => setAbierta(true),
    cerrar: () => setAbierta(false),
    reintentar: () => setIntento((n) => n + 1),
    escribir: (nuevo: string) => {
      setTexto(nuevo)
      reiniciar()
      setAbierta(true)
    },
    elegir: (opcion: OpcionDelBuscador) => {
      alElegir({ id: opcion.id, titulo: opcion.titulo })
      setTexto('')
      reiniciar()
      setAbierta(false)
    },
  }
}
