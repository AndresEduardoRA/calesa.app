'use client'

import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Button } from '@/shared/ui/button'
import { Confirmar } from '@/shared/ui/confirmar'
import type { AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import { useMensajeDelPortal } from '../hooks/use-mensaje-del-portal'
import { useRestablecerMensajeDelPortal } from '../hooks/use-restablecer-mensaje-del-portal'
import { CampoDelMensaje } from './campo-del-mensaje'
import { RechazoAlRestablecer } from './rechazo-al-restablecer'
import { VistaPreviaDelMensaje } from './vista-previa-del-mensaje'

type Props = {
  portal: AjustesDeLeads['portal']
  // Los compone `src/app` (este módulo no depende de `empresa` ni de `web`), para la vista previa.
  empresa: string
  direccion: string | null
}

// Configuración › Leads › «Mensaje del portal» (`?seccion=portal`): el texto para WhatsApp que se le pasa al cliente al darle acceso,
// con su vista previa. Quien lo monta le da la versión como `key`: lo guardado, acá o por otra persona, vuelve a montarlo desde la base.
export function MensajeDelPortal({ portal, empresa, direccion }: Props) {
  const mensaje = useMensajeDelPortal(portal)
  const restablecimiento = useRestablecerMensajeDelPortal(portal)
  return (
    <section aria-label="Mensaje del portal" className="grid gap-4">
      {portal.mensaje === null ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Es el texto de fábrica: nadie lo cambió todavía.
        </p>
      ) : null}
      <form
        className="grid gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          void mensaje.enviar()
        }}
      >
        {mensaje.conflicto ? (
          <AvisoDeConflicto mensaje={mensaje.conflicto} alRecargar={mensaje.recargar} />
        ) : null}
        <CampoDelMensaje
          texto={mensaje.texto}
          motivo={mensaje.motivo}
          alEscribir={mensaje.escribir}
        />
        <VistaPreviaDelMensaje texto={mensaje.texto} empresa={empresa} direccion={direccion} />
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            className="min-h-11 md:min-h-9"
            disabled={!mensaje.hayCambios || mensaje.enCurso}
          >
            {mensaje.enCurso ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            disabled={portal.mensaje === null || mensaje.enCurso || restablecimiento.enCurso}
            onClick={restablecimiento.abrir}
          >
            Restablecer
          </Button>
        </div>
      </form>
      <Confirmar
        abierto={restablecimiento.abierto}
        alCerrar={restablecimiento.cerrar}
        alConfirmar={restablecimiento.confirmar}
        titulo="Restablecer el mensaje del portal"
        descripcion="Vuelve el texto de fábrica y se pierde el de la empresa."
        etiquetaConfirmar="Restablecer"
        enCurso={restablecimiento.enCurso}
      >
        <RechazoAlRestablecer
          rechazo={restablecimiento.rechazo}
          alRecargar={restablecimiento.recargar}
        />
      </Confirmar>
    </section>
  )
}
