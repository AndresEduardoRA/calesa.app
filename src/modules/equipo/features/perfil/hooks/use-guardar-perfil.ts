'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState, type RefObject } from 'react'
import { enfocarPrimerError, errorDeAccion } from '@/shared/lib/formularios'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { descartarAvatar, subirAvatar } from '../../../composicion.client'
import { guardarPerfil } from '../actions/guardar-perfil'

// Qué hacer con la foto al guardar. Elegir un archivo no sube nada: se sube al confirmar.
export type CambioDeFoto = { tipo: 'igual' } | { tipo: 'nueva'; archivo: File } | { tipo: 'quitar' }

type Entrada = {
  usuarioId: string
  // Lo que hay guardado al abrir el formulario.
  avatarRuta: string | null
  actualizadoEn: string
  formulario: RefObject<HTMLFormElement | null>
}

export function useGuardarPerfil({ usuarioId, avatarRuta, actualizadoEn, formulario }: Entrada) {
  const { executeAsync, result, isPending } = useAction(guardarPerfil)
  const [subiendo, setSubiendo] = useState(false)
  // Después de guardar, la próxima edición compara contra lo que acaba de quedar.
  const [guardado, setGuardado] = useState({ avatarRuta, actualizadoEn })

  // Sube la foto (si hay una nueva) y devuelve la ruta a guardar: undefined = no tocarla.
  async function resolverFoto(foto: CambioDeFoto): Promise<string | null | undefined | 'fallo'> {
    if (foto.tipo === 'igual') {
      return undefined
    }
    if (foto.tipo === 'quitar') {
      return null
    }
    const subida = await subirAvatar(usuarioId, foto.archivo)
    if (!subida.ok) {
      avisarError(subida.error)
      return 'fallo'
    }
    return subida.data.ruta
  }

  // Devuelve true si quedó guardado.
  async function guardar(nombre: string, foto: CambioDeFoto): Promise<boolean> {
    setSubiendo(true)
    const nuevaRuta = await resolverFoto(foto)
    setSubiendo(false)
    if (nuevaRuta === 'fallo') {
      return false
    }
    const resultado = await executeAsync({
      nombre,
      avatarRuta: nuevaRuta,
      actualizadoEnEsperado: guardado.actualizadoEn,
    })
    if (!resultado.data?.ok) {
      // La fila no se guardó: la foto recién subida no quedó en ningún perfil.
      if (nuevaRuta) {
        void descartarAvatar(nuevaRuta)
      }
      const error = errorDeAccion(resultado)
      if (error) {
        avisarError(error)
      }
      enfocarPrimerError(formulario.current)
      return false
    }
    if (nuevaRuta !== undefined && guardado.avatarRuta && guardado.avatarRuta !== nuevaRuta) {
      void descartarAvatar(guardado.avatarRuta)
    }
    setGuardado({
      avatarRuta: nuevaRuta === undefined ? guardado.avatarRuta : nuevaRuta,
      actualizadoEn: resultado.data.data.actualizadoEn,
    })
    avisarExito('Perfil guardado')
    return true
  }

  return {
    guardar,
    enCurso: subiendo || isPending,
    errores: result.validationErrors?.fieldErrors,
  }
}
