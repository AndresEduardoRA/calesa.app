'use client'

import { MoreHorizontalIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import {
  ETIQUETA_DE_FAVORITO,
  ETIQUETA_DE_TACHADO,
  type MarcasDeLead,
} from '../../../entities/marcas'
import { ItemEnviarAPapelera } from '../../papelera/components/item-enviar-a-papelera'
import { SelectorDeEtiquetas } from '../../etiquetas/components/selector-de-etiquetas'
import type { Etiquetas } from '../../etiquetas/hooks/use-etiquetas'
import { useMarcas } from '../hooks/use-marcas'

// Alto de un renglón del menú: cómodo para el dedo en el celular, compacto con mouse.
const RENGLON = 'min-h-11 md:min-h-8'

type Props = {
  leadId: string
  nombre: string
  marcas: MarcasDeLead
  etiquetas: Etiquetas
  alGestionar: () => void
  // Quien mira puede enviar este lead a la papelera.
  puedeEnviar: boolean
  // Con el lead en la cartera y `leads.editar`: anotar un seguimiento y agendar un recordatorio (abren
  // su modal sin abrir el drawer). Sin esto, no se ofrecen.
  acciones?: { alAnotar: () => void; alAgendar: () => void } | undefined
}

// Lo que se abre cuando el menú terminó de cerrarse (si no, el foco que vuelve al botón lo cierra).
type Pendiente = 'etiquetas' | 'anotar' | 'agendar' | null

function AccionesDelLead({ alElegir }: { alElegir: (pendiente: Pendiente) => void }) {
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className={RENGLON}
        onClick={() => {
          alElegir('anotar')
        }}
      >
        Anotar seguimiento…
      </DropdownMenuItem>
      <DropdownMenuItem
        className={RENGLON}
        onClick={() => {
          alElegir('agendar')
        }}
      >
        Agendar recordatorio…
      </DropdownMenuItem>
    </>
  )
}

// «Favorito» y «Tachado»: se marcan sin cerrar el menú (tachar sí lo cierra: ofrece «Deshacer»).
function CasillasDeMarcas({ marcas }: { marcas: ReturnType<typeof useMarcas> }) {
  const { esFavorito, estaTachado } = marcas.marcas
  return (
    <>
      <DropdownMenuCheckboxItem
        className={RENGLON}
        checked={esFavorito}
        disabled={marcas.enCurso.favorito}
        onCheckedChange={(valor) => void marcas.favorito(valor)}
      >
        {ETIQUETA_DE_FAVORITO}
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem
        className={RENGLON}
        checked={estaTachado}
        disabled={marcas.enCurso.tachado}
        closeOnClick
        onCheckedChange={(valor) => void marcas.tachado(valor)}
      >
        {ETIQUETA_DE_TACHADO}
      </DropdownMenuCheckboxItem>
    </>
  )
}

// El «⋯» de una fila del listado: las marcas de quien mira sobre ese lead y, con la cartera, anotar un
// seguimiento y agendar un recordatorio. «Etiquetas…» cierra el menú y abre el selector contra el
// mismo botón; anotar y agendar abren su modal, y el foco vuelve a este botón. Nada de lo que pasa
// adentro abre el drawer de la fila (los clics no suben).
export function MenuDeLead({
  leadId,
  nombre,
  marcas: inicial,
  etiquetas,
  alGestionar,
  puedeEnviar,
  acciones,
}: Props) {
  const marcas = useMarcas(leadId, inicial)
  const boton = useRef<HTMLButtonElement>(null)
  const [selector, setSelector] = useState(false)
  const [pendiente, setPendiente] = useState<Pendiente>(null)
  return (
    <div
      className="flex justify-end"
      onClick={(evento) => {
        evento.stopPropagation()
      }}
    >
      <DropdownMenu
        onOpenChangeComplete={(abierto) => {
          if (abierto || pendiente === null) {
            return
          }
          setPendiente(null)
          if (pendiente === 'etiquetas') {
            setSelector(true)
          } else if (pendiente === 'anotar') {
            acciones?.alAnotar()
          } else {
            acciones?.alAgendar()
          }
        }}
      >
        <DropdownMenuTrigger
          ref={boton}
          aria-label={`Más acciones de ${nombre}`}
          data-menu-de-lead={leadId}
          className="flex size-[44px] items-center justify-center rounded-(--radius-md) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:size-8"
        >
          <MoreHorizontalIcon aria-hidden className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <CasillasDeMarcas marcas={marcas} />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={RENGLON}
            onClick={() => {
              setPendiente('etiquetas')
            }}
          >
            Etiquetas…
          </DropdownMenuItem>
          {acciones ? <AccionesDelLead alElegir={setPendiente} /> : null}
          {puedeEnviar ? <ItemEnviarAPapelera leadId={leadId} renglon={RENGLON} /> : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <SelectorDeEtiquetas
        etiquetas={etiquetas}
        puestas={marcas.marcas.etiquetas}
        alCambiar={(id, valor) => void marcas.etiqueta(id, valor)}
        enCurso={marcas.enCurso.etiquetas}
        alGestionar={alGestionar}
        abierto={selector}
        alCambiarAbierto={setSelector}
        ancla={boton}
      />
    </div>
  )
}
