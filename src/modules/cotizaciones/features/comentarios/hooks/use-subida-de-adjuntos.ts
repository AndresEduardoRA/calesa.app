'use client'

import { useRef, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { fallo, MENSAJE_SIN_CONEXION, type ErrorApp } from '@/shared/lib/errores'
import { subirAdjunto } from '../../../areas/comentarios/composicion.client'
import { repartirElegidos, type Adjunto } from '../../../entities/comentarios/adjunto'
import { adjuntar } from '../actions/adjuntar'

export type SubidaPendiente = {
  clave: string
  archivo: File
  subiendo: boolean
  error: ErrorApp | null
}

const NO_SE_ADJUNTO = 'No se pudo adjuntar el archivo. Prueba de nuevo.'

// Sube y registra un archivo: primero al bucket (el navegador), después la action. Lo que falla vuelve como error, con el mensaje de la base si vino de ahí.
async function subirYRegistrar(cotizacionId: string, archivo: File) {
  const subido = await subirAdjunto(cotizacionId, archivo).catch(() =>
    fallo('inesperado', `No se pudo subir ${archivo.name}. Prueba de nuevo.`),
  )
  if (!subido.ok) {
    return subido
  }
  const envio = await enviarAccion<Adjunto>(
    adjuntar({ cotizacionId, ...subido.data }),
    NO_SE_ADJUNTO,
  )
  if (!envio.ok && 'sinRed' in envio && !window.navigator.onLine) {
    return fallo('inesperado', MENSAJE_SIN_CONEXION)
  }
  return envio
}

// Lo elegido en la zona (4.27-3): lo que no se puede subir se dice debajo, uno por línea; lo demás se sube de a uno, en orden, con su fila «Subiendo…». Bien, la
// fila se cambia por el adjunto; mal, queda con el mensaje, «Reintentar» (subir lo mismo es inocuo: el nombre es el hash) y «Descartar».
export function useSubidaDeAdjuntos(
  cotizacionId: string,
  cargados: number,
  agregar: (adjunto: Adjunto) => void,
) {
  const [rechazos, setRechazos] = useState<string[]>([])
  const [pendientes, setPendientes] = useState<SubidaPendiente[]>([])
  const siguiente = useRef(0)

  const cambiar = (clave: string, cambio: Partial<SubidaPendiente> | null) => {
    setPendientes((antes) =>
      cambio === null
        ? antes.filter((p) => p.clave !== clave)
        : antes.map((p) => (p.clave === clave ? { ...p, ...cambio } : p)),
    )
  }

  async function subir(pendiente: Pick<SubidaPendiente, 'clave' | 'archivo'>): Promise<void> {
    cambiar(pendiente.clave, { subiendo: true, error: null })
    const resultado = await subirYRegistrar(cotizacionId, pendiente.archivo)
    if (resultado.ok) {
      agregar(resultado.data)
      cambiar(pendiente.clave, null)
    } else {
      cambiar(pendiente.clave, { subiendo: false, error: resultado.error })
    }
  }

  async function elegir(archivos: File[]): Promise<void> {
    const enCola = pendientes.filter((p) => p.error === null).length
    const reparto = repartirElegidos(archivos, cargados + enCola)
    setRechazos(reparto.rechazos)
    const nuevos = reparto.aceptados.map((archivo) => {
      siguiente.current += 1
      return { clave: `subida-${String(siguiente.current)}`, archivo, subiendo: true, error: null }
    })
    setPendientes((antes) => [...nuevos, ...antes])
    for (const nuevo of nuevos) {
      await subir(nuevo)
    }
  }

  return {
    rechazos,
    pendientes,
    subiendo: pendientes.some((p) => p.subiendo),
    elegir: (archivos: File[]) => void elegir(archivos),
    reintentar: (pendiente: SubidaPendiente) => void subir(pendiente),
    descartar: (clave: string) => {
      cambiar(clave, null)
    },
  }
}
