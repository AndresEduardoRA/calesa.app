'use client'

import { useId } from 'react'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { versionDelAcceso, type AccesoDelCliente } from '../../../entities/portal'
import { useOtorgarPortal } from '../hooks/use-otorgar-portal'
import { AccesoOtorgado } from './acceso-otorgado'
import { FormularioDeClave } from './formulario-de-clave'

type Props = {
  abierto: boolean
  alCerrar: () => void
  leadId: string
  leadNombre: string
  acceso: AccesoDelCliente
  empresa: string
  direccion: string | null
}

// «Dar acceso» o «Volver a otorgar» (`?panel=otorgar-portal`): una clave escrita (al menos 8) o una
// generada por la base. Al terminar muestra el código en grande, la clave y el texto para WhatsApp, una
// sola vez. Con un acceso que existe lleva su versión: si otra persona otorgó entre tanto, lo dice con
// «Recargar» y lo escrito queda.
export function DialogoDeOtorgar({
  abierto,
  alCerrar,
  leadId,
  leadNombre,
  acceso,
  empresa,
  direccion,
}: Props) {
  const idForm = useId()
  const otorgar = useOtorgarPortal({ leadId, version: versionDelAcceso(acceso), abierto })

  if (otorgar.otorgado) {
    return (
      <Modal
        abierto={abierto}
        alCerrar={alCerrar}
        titulo={`${leadNombre} ya tiene acceso al portal`}
        pie={<Button onClick={alCerrar}>Listo</Button>}
      >
        <AccesoOtorgado
          otorgado={otorgar.otorgado}
          leadNombre={leadNombre}
          empresa={empresa}
          direccion={direccion}
        />
      </Modal>
    )
  }

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={
        acceso.estado === 'sin_acceso' ? 'Dar acceso al portal' : 'Volver a otorgar el acceso'
      }
      descripcion={`${leadNombre} verá en la web cómo va su compra y lo que marques «Visible para el cliente».`}
      pie={
        <>
          <Button variant="ghost" onClick={alCerrar} disabled={otorgar.enCurso}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={() => void otorgar.generar()}
            disabled={otorgar.enCurso}
          >
            Generar clave y dar acceso
          </Button>
          <Button type="submit" form={idForm} disabled={otorgar.enCurso || otorgar.clave === ''}>
            {otorgar.enCurso ? 'Otorgando…' : 'Dar acceso'}
          </Button>
        </>
      }
    >
      <FormularioDeClave id={idForm} acceso={acceso} otorgar={otorgar} />
    </Modal>
  )
}
