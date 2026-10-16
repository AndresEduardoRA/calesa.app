'use client'

import { useId } from 'react'
import { Button } from '@/shared/ui/button'
import { ConfirmarDescarte } from '@/shared/ui/confirmar-descarte'
import { Modal } from '@/shared/ui/modal'
import { useCierreConCambios } from '@/shared/ui/use-cierre-con-cambios'
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

// El texto del único botón principal: dice qué va a pasar con lo que hay en el campo.
function etiquetaDeOtorgar(enCurso: boolean, clave: string): string {
  if (enCurso) {
    return 'Otorgando…'
  }
  return clave === '' ? 'Generar clave y dar acceso' : 'Dar acceso con esta clave'
}

// «Dar acceso» o «Volver a otorgar» (`?panel=otorgar-portal`): un solo botón principal, que con el
// campo vacío genera la clave en la base y con algo escrito da esa (nunca se tira en silencio lo que se
// escribió). Al terminar muestra el código en grande, la clave y el texto para WhatsApp, una sola vez.
// Mientras otorga no se cierra. La clave se olvida cuando el diálogo termina de irse. Con un acceso que
// existe lleva su versión: si otra persona otorgó entre tanto, lo dice con «Recargar» y lo escrito
// queda.
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
  const { otorgado, enCurso } = otorgar
  // Cerrar con una clave escrita pregunta en el pie, como todo formulario con algo escrito (9d-3).
  const cierre = useCierreConCambios({
    hayCambios: !otorgado && otorgar.clave !== '',
    alCerrar,
    abierto,
  })
  const comun = {
    abierto,
    alCerrar,
    bloqueado: enCurso,
    ancho: 'amplio' as const,
    alTerminarDeCerrar: otorgar.olvidar,
  }

  if (otorgado) {
    return (
      <Modal
        {...comun}
        titulo={`${leadNombre} ya tiene acceso al portal`}
        pie={<Button onClick={alCerrar}>Listo</Button>}
      >
        <AccesoOtorgado
          otorgado={otorgado}
          leadNombre={leadNombre}
          empresa={empresa}
          direccion={direccion}
        />
      </Modal>
    )
  }

  return (
    <Modal
      {...comun}
      alCerrar={cierre.intentarCerrar}
      titulo={
        acceso.estado === 'sin_acceso' ? 'Dar acceso al portal' : 'Volver a otorgar el acceso'
      }
      descripcion={`${leadNombre} verá en la web cómo va su compra y lo que marques «Visible para el cliente».`}
      // Con puntero, al campo; en una pantalla táctil, al diálogo: generar es el camino corto y el
      // teclado no tiene por qué saltar.
      focoInicial={(tipo) => (tipo === 'touch' ? true : document.getElementById(`${idForm}-clave`))}
      pie={
        cierre.confirmando ? (
          <ConfirmarDescarte alSeguir={cierre.seguir} alDescartar={cierre.descartar} />
        ) : (
          <>
            <Button variant="ghost" onClick={cierre.intentarCerrar} disabled={enCurso}>
              Cancelar
            </Button>
            <Button type="submit" form={idForm} disabled={enCurso || otorgar.esperaVersion}>
              {etiquetaDeOtorgar(enCurso, otorgar.clave)}
            </Button>
          </>
        )
      }
    >
      <FormularioDeClave id={idForm} acceso={acceso} otorgar={otorgar} />
    </Modal>
  )
}
