'use client'

import { Campo } from '@/shared/ui/campo'
import { Interruptor } from '@/shared/ui/interruptor'
import { LARGO_MAXIMO_DE_ACCION } from '../../../entities/transiciones/formulario-de-salida'

type Props = {
  accion: string
  notaObligatoria: boolean
  error?: string
  deshabilitado: boolean
  alCambiarAccion: (valor: string) => void
  alCambiarNota: (valor: boolean) => void
  autoFocus?: boolean
}

// Los dos campos que el alta y la edición de una salida comparten: lo que dirá el botón al mover y si pide nota.
export function CamposDeSalida({
  accion,
  notaObligatoria,
  error,
  deshabilitado,
  alCambiarAccion,
  alCambiarNota,
  autoFocus,
}: Props) {
  return (
    <>
      <Campo
        nombre="accion"
        etiqueta="Acción"
        autoComplete="off"
        autoFocus={autoFocus}
        maxLength={LARGO_MAXIMO_DE_ACCION * 2}
        value={accion}
        onChange={(evento) => {
          alCambiarAccion(evento.target.value)
        }}
        error={error}
        ayuda="Lo que dirá el botón al mover, por ejemplo «Embarcar». Vacío dice «Mover»."
      />
      <Interruptor
        titulo="Pide nota al mover"
        ayuda="Quien mueva por esta salida tendrá que escribir una nota."
        valor={notaObligatoria}
        alCambiar={alCambiarNota}
        deshabilitado={deshabilitado}
      />
    </>
  )
}
