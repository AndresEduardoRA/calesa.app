'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { EnlaceInvitacion } from './enlace-invitacion'

export type EnlaceGenerado = { nombre: string; enlace: string }

type Props = {
  // El enlace que se acaba de generar para alguien con la invitación pendiente; null = cerrado.
  // No tiene URL propia a propósito: es de un solo uso y no se puede volver a mostrar.
  generado: EnlaceGenerado | null
  alCerrar: () => void
}

export function EnlaceDePersona({ generado, alCerrar }: Props) {
  const mostrado = useUltimo(generado)
  return (
    <Modal
      abierto={generado !== null}
      alCerrar={alCerrar}
      titulo={mostrado ? `Enlace para ${mostrado.nombre}` : 'Enlace de invitación'}
      pie={<Button onClick={alCerrar}>Listo</Button>}
    >
      {mostrado ? (
        <div className="grid gap-4">
          <Aviso tono="aviso">
            Este enlace reemplaza al anterior: el que tenía (también el del correo) ya no sirve.
          </Aviso>
          <EnlaceInvitacion enlace={mostrado.enlace} />
        </div>
      ) : null}
    </Modal>
  )
}
