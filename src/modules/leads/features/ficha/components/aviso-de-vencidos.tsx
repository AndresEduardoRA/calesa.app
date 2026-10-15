import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { CLAVE_DE_SECCION, type SeccionDeLead } from '../../../entities/ficha'

type Props = { leadId: string; vencidos: number; seccion: SeccionDeLead }

export function textoDeVencidos(vencidos: number): string {
  return vencidos === 1
    ? 'Tienes 1 recordatorio vencido sobre este lead.'
    : `Tienes ${String(vencidos)} recordatorios vencidos sobre este lead.`
}

// Los recordatorios propios que ya pasaron y no se completaron, dichos arriba de la ficha (vienen
// en `lead_ficha()`: no cuesta otra lectura). Fuera de «Seguimientos», lleva hasta ellos.
export function AvisoDeVencidos({ leadId, vencidos, seccion }: Props) {
  if (vencidos === 0) {
    return null
  }
  return (
    <Aviso tono="aviso">
      <span>
        {textoDeVencidos(vencidos)}{' '}
        {seccion === 'seguimientos' ? null : (
          <Link
            href={`${RUTAS.leads}/${leadId}?${CLAVE_DE_SECCION}=seguimientos` as Route}
            className="font-medium underline underline-offset-2"
          >
            Verlos
          </Link>
        )}
      </span>
    </Aviso>
  )
}
