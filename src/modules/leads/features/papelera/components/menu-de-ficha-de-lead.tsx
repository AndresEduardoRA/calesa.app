'use client'

import { MoreHorizontalIcon, Trash2Icon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { RUTAS } from '@/shared/lib/rutas'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { ETIQUETA_DE_ENVIAR } from '../../../entities/papelera'
import { useEnvioAPapelera } from '../hooks/use-envio-a-papelera'

type Props = { leadId: string; nombre: string }

// El «⋯» de la cabecera de la ficha: «Enviar a la papelera». Sólo se dibuja para quien puede enviar
// este lead. Se hace y ofrece «Deshacer»; después lleva al listado, porque la ficha ya no existe
// para nadie.
export function MenuDeFichaDeLead({ leadId, nombre }: Props) {
  const router = useRouter()
  const envio = useEnvioAPapelera()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Más acciones de ${nombre}`}
        className="flex h-11 w-11 items-center justify-center rounded-(--radius-md) border border-(--color-line) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:h-9 md:w-9"
      >
        <MoreHorizontalIcon aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem
          className="min-h-11 md:min-h-8"
          disabled={envio.enCurso}
          onClick={() => {
            void envio.enviar([leadId]).then((entro) => {
              if (entro) {
                router.push(RUTAS.leads as never)
              }
            })
          }}
        >
          <Trash2Icon aria-hidden />
          {ETIQUETA_DE_ENVIAR}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
