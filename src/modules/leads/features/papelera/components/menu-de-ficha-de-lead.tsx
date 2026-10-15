'use client'

import { CarFrontIcon, MoreHorizontalIcon, Trash2Icon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { RUTAS } from '@/shared/lib/rutas'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { CLAVE_DE_SECCION } from '../../../entities/ficha'
import { ETIQUETA_DE_ENVIAR, motivoParaNoEnviar } from '../../../entities/papelera'
import { useEnvioAPapelera } from '../hooks/use-envio-a-papelera'

type Props = {
  leadId: string
  nombre: string
  // Los vinculados que quien mira ve: con alguno, la base lo va a rechazar.
  vehiculosVinculados: number
}

// El «⋯» de la cabecera de la ficha: «Enviar a la papelera». Sólo se dibuja para quien puede enviar
// este lead. Se hace y ofrece «Deshacer»; después lleva al listado, porque la ficha ya no existe
// para nadie. Con un vehículo vinculado que quien mira ve, se apaga con el motivo y ofrece ir a
// «Vehículos»; si lo frena uno que no ve, lo dice la base al intentar.
export function MenuDeFichaDeLead({ leadId, nombre, vehiculosVinculados }: Props) {
  const router = useRouter()
  const envio = useEnvioAPapelera()
  const motivo = motivoParaNoEnviar(vehiculosVinculados)
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
          disabled={envio.enCurso || motivo !== null}
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
        {motivo ? (
          <>
            {/* Un párrafo y no una etiqueta de menú: esas sólo valen dentro de un grupo. */}
            <p className="px-1.5 py-1.5 text-(length:--text-xs) text-(--color-ink-faint)">
              {motivo}
            </p>
            <DropdownMenuItem
              className="min-h-11 md:min-h-8"
              onClick={() => {
                router.push(`${RUTAS.leads}/${leadId}?${CLAVE_DE_SECCION}=vehiculos` as never)
              }}
            >
              <CarFrontIcon aria-hidden />
              Ir a «Vehículos»
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
