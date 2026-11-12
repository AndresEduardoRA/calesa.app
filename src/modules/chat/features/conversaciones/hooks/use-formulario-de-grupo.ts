'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioDeModal } from '@/shared/ui/use-envio-de-modal'
import { validarGrupo } from '../../../entities/grupos'
import type { PersonaEncontrada } from '../../../entities/personas'
import { MENSAJE_DE_VALIDACION } from '../../resultado'
import { crearGrupo } from '../actions/crear-grupo'

type Args = {
  abierto: boolean
  // Con el id del grupo creado: la pantalla lo abre.
  alCrear: (conversacion: string) => void
}

// El estado del modal «Nuevo grupo»: nombre y personas elegidas, validados con las reglas de la base. El id del grupo se genera una vez por
// apertura (el modal se monta de nuevo en cada una): un reintento sin red lo reusa y la base responde `repetido`, no duplica.
export function useFormularioDeGrupo({ abierto, alCrear }: Args) {
  const [id] = useState(() => crypto.randomUUID())
  const [nombre, setNombre] = useState('')
  const [elegidas, setElegidas] = useState<PersonaEncontrada[]>([])
  const crear = useAction(crearGrupo)
  const miembros = elegidas.map((persona) => persona.id)

  const envio = useEnvioDeModal<{ id: string }>({
    abierto,
    hayCambios: nombre.trim() !== '' || elegidas.length > 0,
    validar: () => validarGrupo({ nombre, miembros }),
    pedir: () => enviarAccion(crear.executeAsync({ id, nombre, miembros }), MENSAJE_DE_VALIDACION),
    alGuardar: (grupo) => {
      avisarExito(`Grupo «${nombre.trim()}» creado`)
      alCrear(grupo.id)
    },
  })

  return {
    ...envio,
    nombre,
    elegidas,
    escribir: (valor: string) => {
      setNombre(valor)
      envio.quitarMotivo('nombre')
    },
    sumar: (persona: PersonaEncontrada) => {
      setElegidas((antes) => (antes.some((p) => p.id === persona.id) ? antes : [...antes, persona]))
      envio.quitarMotivo('miembros')
    },
    quitar: (persona: PersonaEncontrada) => {
      setElegidas((antes) => antes.filter((p) => p.id !== persona.id))
    },
  }
}
