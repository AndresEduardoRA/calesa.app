'use client'

import { Confirmar } from '@/shared/ui/confirmar'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  descripcionDeBaja,
  nombreDePersona,
  type PersonaDelEquipo,
  type VistaPreviaDeBaja,
} from '../../../entities/persona'

type Props = {
  // La persona que se pidió dar de baja; null = el diálogo está cerrado.
  persona: PersonaDelEquipo | null
  // Lo que eso implica, contado por la base ANTES de confirmar. Mientras no llega, el diálogo no
  // se abre: nadie confirma una baja sin ver cuántos leads van al limbo.
  vistaPrevia: VistaPreviaDeBaja | null
  enCurso: boolean
  alConfirmar: (persona: PersonaDelEquipo) => void
  alCerrar: () => void
}

// Dar de baja no se deshace: el diálogo nombra a la persona y dice cuántos leads van al limbo.
export function ConfirmarBaja({ persona, vistaPrevia, enCurso, alConfirmar, alCerrar }: Props) {
  const abierto = persona !== null && vistaPrevia !== null
  // Lo último que mostró, para que no se vacíe mientras se cierra.
  const mostrada = useUltimo(persona)
  const cuenta = useUltimo(vistaPrevia)
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={() => {
        if (persona) {
          alConfirmar(persona)
        }
      }}
      titulo={mostrada ? `Dar de baja a ${nombreDePersona(mostrada)}` : 'Dar de baja'}
      descripcion={cuenta ? descripcionDeBaja(cuenta) : ''}
      etiquetaConfirmar="Dar de baja"
      enCurso={enCurso}
    />
  )
}
