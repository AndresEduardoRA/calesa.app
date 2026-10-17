'use client'

import { useState } from 'react'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { validarMotivo } from '../../../entities/oportunidad'

type Args = {
  // Mueve la oportunidad (quien la tiene avisa si la base la rechaza); `true` si se movió.
  alMover: (motivo: string | null) => Promise<boolean>
  alCerrar: () => void
}

// El estado del modal de «Mover a …» una etapa perdida: el motivo (opcional, hasta 200), el envío y qué lo frena. Sin
// conexión no se manda nada y el modal lo dice; si la base rechaza el movimiento, el aviso de quien mueve sale y el modal
// sigue abierto con lo escrito. Un envío a la vez.
export function useFormularioDeMovida({ alMover, alCerrar }: Args) {
  const enLinea = useEnLinea()
  const [motivo, setMotivo] = useState('')
  const { mandar, enCurso } = useUnEnvioALaVez()
  const error = validarMotivo(motivo)

  async function enviar(): Promise<boolean> {
    if (error !== null || !enLinea) {
      return false
    }
    const limpio = motivo.trim()
    const movida = await mandar(() => alMover(limpio === '' ? null : limpio))
    if (movida === true) {
      alCerrar()
      return true
    }
    return false
  }

  return {
    motivo,
    error,
    escribir: setMotivo,
    enCurso,
    // Cerrar ahora perdería lo escrito: el modal pregunta antes.
    hayCambios: motivo.trim() !== '',
    conflicto: null,
    aviso: null,
    enLinea,
    esperandoConexion: false,
    enviar,
    reintentar: () => {
      void enviar()
    },
  }
}
