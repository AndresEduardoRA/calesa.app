'use client'

import { useAction } from 'next-safe-action/hooks'
import { KeyRoundIcon } from 'lucide-react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { AccesoDelCliente } from '../../../entities/portal'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { desbloquearPortal } from '../actions/desbloquear-portal'
import { usePanelDePortal } from '../hooks/use-panel-de-portal'
import { DialogoDeOtorgar } from './dialogo-de-otorgar'
import { DialogoDeRevocar } from './dialogo-de-revocar'
import { TarjetaDelAcceso } from './tarjeta-del-acceso'

type Props = {
  leadId: string
  leadNombre: string
  acceso: AccesoDelCliente
  // Para el texto de WhatsApp: el nombre de la empresa y la dirección de la web (nula si no hay).
  empresa: string
  direccion: string | null
}

// La sección «Portal» de la ficha (sólo con el lead en la cartera y `leads.portal.gestionar`): cómo está
// el acceso del cliente y lo que se puede hacer. Nunca se dibuja vacía: sin acceso, explica y ofrece
// darlo.
export function PortalDelLead({ leadId, leadNombre, acceso, empresa, direccion }: Props) {
  const panel = usePanelDePortal()
  const desbloqueo = useAction(desbloquearPortal)
  const vigente = acceso.estado === 'activo' || acceso.estado === 'bloqueado'

  async function desbloquear() {
    const envio = await enviarAccion(desbloqueo.executeAsync({ leadId }), MENSAJE_DE_VALIDACION)
    if (!envio.ok) {
      avisarError(envio.error)
      return
    }
    avisarExito('Listo: ya puede volver a intentar.')
  }

  return (
    <section aria-labelledby="titulo-portal" className="grid gap-4">
      <div className="grid gap-1">
        <h2 id="titulo-portal" className="text-(length:--text-lg) font-semibold text-(--color-ink)">
          Acceso al portal
        </h2>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Con un código y una clave, el cliente ve en la web cómo va su compra.
        </p>
      </div>
      {acceso.estado === 'sin_acceso' ? (
        <EstadoVacio
          Icono={KeyRoundIcon}
          titulo="Todavía no tiene acceso al portal"
          descripcion="Al dárselo verás un código para dictarle y un texto listo para mandarle por WhatsApp."
          accion={
            <Button className="h-11 md:h-9" onClick={panel.abrirOtorgar}>
              Dar acceso
            </Button>
          }
        />
      ) : (
        <TarjetaDelAcceso
          acceso={acceso}
          enCurso={desbloqueo.isExecuting}
          alVolverAOtorgar={panel.abrirOtorgar}
          alRevocar={panel.abrirRevocar}
          alDesbloquear={() => void desbloquear()}
        />
      )}
      <DialogoDeOtorgar
        abierto={panel.otorgando}
        alCerrar={panel.cerrar}
        leadId={leadId}
        leadNombre={leadNombre}
        acceso={acceso}
        empresa={empresa}
        direccion={direccion}
      />
      {vigente ? (
        <DialogoDeRevocar
          abierto={panel.revocando}
          alCerrar={panel.cerrar}
          leadId={leadId}
          leadNombre={leadNombre}
          codigo={acceso.codigo}
        />
      ) : null}
    </section>
  )
}
