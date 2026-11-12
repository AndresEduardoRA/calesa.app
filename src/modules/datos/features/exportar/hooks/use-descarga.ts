'use client'

import { useCallback, useRef, useState } from 'react'
import { descargarArchivo } from '@/shared/lib/csv/descargar'
import {
  estadoDeLaRespuesta,
  nombreDeLaDisposicion,
  type EstadoDeDescarga,
} from '../../../entities/descarga'
import type { Pedido } from '../../../entities/exportacion'

const RUTA = '/datos/exportar'

async function cuerpoJson(respuesta: Response): Promise<unknown> {
  try {
    return await respuesta.json()
  } catch {
    return null
  }
}

// El POST de una tarjeta: espera el archivo entero y lo descarga; si el flujo se corta a la mitad, no hay archivo.
async function pedirArchivo(pedido: Pedido): Promise<EstadoDeDescarga> {
  let respuesta: Response
  try {
    respuesta = await fetch(RUTA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pedido),
      cache: 'no-store',
    })
  } catch {
    return { tipo: 'error', motivo: 'sin_red' }
  }
  const tipo = respuesta.headers.get('content-type') ?? ''
  const esJson = !respuesta.ok && tipo.includes('application/json')
  const lectura = estadoDeLaRespuesta({
    status: respuesta.status,
    tipo,
    redirigida: respuesta.redirected,
    cuerpo: esJson ? await cuerpoJson(respuesta) : null,
  })
  if (lectura.tipo !== 'archivo') {
    return lectura
  }
  try {
    const blob = await respuesta.blob()
    const nombre = nombreDeLaDisposicion(
      respuesta.headers.get('content-disposition'),
      pedido.entidad,
    )
    descargarArchivo(blob, nombre)
    return { tipo: 'listo', nombre }
  } catch {
    return { tipo: 'error', motivo: 'generico' }
  }
}

// Un pedido a la vez por tarjeta: mientras se prepara, otro «Descargar» no manda nada. «Reintentar» repite el último.
export function useDescarga() {
  const [estado, setEstado] = useState<EstadoDeDescarga>({ tipo: 'reposo' })
  const enCurso = useRef(false)
  const ultimo = useRef<Pedido | null>(null)

  const descargar = useCallback(async (pedido: Pedido) => {
    if (enCurso.current) {
      return
    }
    enCurso.current = true
    ultimo.current = pedido
    setEstado({ tipo: 'preparando' })
    try {
      setEstado(await pedirArchivo(pedido))
    } finally {
      enCurso.current = false
    }
  }, [])

  const reintentar = useCallback(() => {
    if (ultimo.current) {
      void descargar(ultimo.current)
    }
  }, [descargar])

  return { estado, descargar, reintentar }
}
