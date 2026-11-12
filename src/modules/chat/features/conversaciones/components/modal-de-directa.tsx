'use client'

import { useAction } from 'next-safe-action/hooks'
import { useCallback, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { Aviso } from '@/shared/ui/aviso'
import { Modal } from '@/shared/ui/modal'
import { leerPersonas } from '../../../composicion.client'
import { MENSAJE_DE_VALIDACION } from '../../resultado'
import { abrirDirecta } from '../actions/abrir-directa'
import { BuscadorDePersonas } from './buscador-de-personas'

type Props = {
  abierto: boolean
  alCerrar: () => void
  usuarioId: string
  // Con el id de la conversación (la que ya existía o la creada): la pantalla la abre.
  alAbrir: (conversacion: string) => void
}

// «Nueva conversación»: buscar a una persona y elegirla. Elegir actúa al instante (un clic = un pedido); la directa que ya existe se abre, no se
// duplica. Un rechazo (esa persona no puede usar el chat, sin conexión) se dice dentro del modal y se puede volver a elegir.
export function ModalDeDirecta({ abierto, alCerrar, usuarioId, alAbrir }: Props) {
  const abrir = useAction(abrirDirecta)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const leer = useCallback((texto: string) => leerPersonas(texto, usuarioId), [usuarioId])

  async function elegir(persona: { id: string }) {
    setOcupado(true)
    setAviso(null)
    const envio = await enviarAccion(
      abrir.executeAsync({ usuario: persona.id }),
      MENSAJE_DE_VALIDACION,
    )
    setOcupado(false)
    if (envio.ok) {
      alAbrir(envio.data.id)
    } else {
      setAviso(envio.error.mensaje)
    }
  }

  return (
    <Modal
      abierto={abierto}
      alCerrar={() => {
        setAviso(null)
        alCerrar()
      }}
      titulo="Nueva conversación"
      descripcion="Busca a la persona del equipo a quien quieres escribirle."
      bloqueado={ocupado}
    >
      {aviso ? <Aviso tono="peligro">{aviso}</Aviso> : null}
      <BuscadorDePersonas
        etiqueta="Persona"
        leer={leer}
        ocupado={ocupado}
        alElegir={(persona) => void elegir(persona)}
        enfocar
      />
    </Modal>
  )
}
