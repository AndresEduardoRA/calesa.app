'use client'

import { Trash2Icon } from 'lucide-react'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/dropdown-menu'
import { ETIQUETA_DE_ENVIAR } from '../../../entities/papelera'
import { useEnvioAPapelera } from '../hooks/use-envio-a-papelera'

type Props = { leadId: string; renglon: string }

// «Enviar a la papelera» en el «⋯» de una fila del listado. Se hace y ofrece «Deshacer»; el listado
// se vuelve a leer solo y la fila desaparece. Sólo se dibuja para quien puede enviar ese lead.
export function ItemEnviarAPapelera({ leadId, renglon }: Props) {
  const envio = useEnvioAPapelera()
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className={renglon}
        disabled={envio.enCurso}
        onClick={() => {
          void envio.enviar([leadId])
        }}
      >
        <Trash2Icon aria-hidden />
        {ETIQUETA_DE_ENVIAR}
      </DropdownMenuItem>
    </>
  )
}
