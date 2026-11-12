'use client'

import { Bloque } from '@/shared/ui/bloque'
import { Interruptor } from '@/shared/ui/interruptor'
import type { Integracion } from '../../../entities/integraciones'
import { MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'
import { usePushWeb } from '../hooks/use-push-web'

type Props = { pushWeb: Integracion; sinClavePublica: boolean; puedeEditar: boolean }

const AYUDA =
  'Con los avisos activos, las personas con permiso reciben en su navegador los avisos que ya ven en la campana. Cada persona los enciende en su perfil.'
const SIN_CLAVE = 'Falta la clave pública: sin ella nadie puede activar el aviso en su navegador.'

// La tarjeta «Avisos push»: el interruptor de la empresa. Encenderlo no exige la clave pública; si falta, lo dice.
export function PushWeb({ pushWeb, sinClavePublica, puedeEditar }: Props) {
  const ediciones = usePushWeb(pushWeb.actualizadoEn)
  return (
    <Bloque
      titulo="Avisos push"
      descripcion="Manda a los navegadores de tu equipo los avisos de la campana."
    >
      <Interruptor
        titulo="Activos"
        ayuda={sinClavePublica ? `${AYUDA} ${SIN_CLAVE}` : AYUDA}
        valor={pushWeb.activa}
        alCambiar={(activa) => void ediciones.cambiarEstado(activa)}
        deshabilitado={!puedeEditar || ediciones.enCurso}
      />
      {puedeEditar ? null : (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          {MOTIVO_SIN_PERMISO_AJUSTES}
        </p>
      )}
    </Bloque>
  )
}
