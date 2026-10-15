'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarError } from '@/shared/ui/toasts'
import { validarNombreDeEmbudo, type Embudo } from '../../../entities/embudo'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { crearEmbudo } from '../actions/crear-embudo'

// Crear un embudo: el nombre, validado como en la base. El id del intento vive mientras el diálogo
// está abierto (un reintento no crea dos).
export function useNuevoEmbudo(embudos: readonly Embudo[], alCrear: (id: string) => void) {
  const [intento] = useState(() => crypto.randomUUID())
  const [nombre, setNombre] = useState('')
  const [motivo, setMotivo] = useState<string | null>(null)
  const crear = useAction(crearEmbudo)

  async function enviar() {
    const error = validarNombreDeEmbudo(nombre, embudos, null)
    if (error) {
      setMotivo(error)
      return
    }
    const envio = await enviarAccion(
      crear.executeAsync({ id: intento, nombre: nombre.trim() }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      if (envio.error.codigo === 'regla') {
        setMotivo(envio.error.mensaje)
      } else {
        avisarError(envio.error)
      }
      return
    }
    alCrear(envio.data.embudo?.id ?? intento)
  }

  return {
    nombre,
    setNombre: (valor: string) => {
      setNombre(valor)
      setMotivo(null)
    },
    motivo,
    enCurso: crear.isPending,
    enviar,
  }
}
