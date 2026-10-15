'use client'

import { useState, type ReactElement, type RefObject } from 'react'
import { Command, CommandInput } from '@/shared/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import {
  MAXIMO_DE_ETIQUETAS_POR_LEAD,
  etiquetaConNombre,
  filtrarEtiquetas,
} from '../../../entities/etiqueta'
import type { Etiquetas } from '../hooks/use-etiquetas'
import { OpcionesDeEtiquetas } from './opciones-de-etiquetas'

type Props = {
  etiquetas: Etiquetas
  // Las de quien mira puestas en el lead.
  puestas: readonly string[]
  // Poner, no alternar: el valor que se pide.
  alCambiar: (id: string, valor: boolean) => void
  enCurso: boolean
  alGestionar: () => void
  abierto: boolean
  alCambiarAbierto: (abierto: boolean) => void
  // El botón que lo abre (la ficha), o el elemento contra el que se abre (el «⋯» de una fila).
  disparador?: ReactElement
  ancla?: RefObject<HTMLElement | null>
}

// Elegir las etiquetas de quien mira para un lead: buscar, marcar y desmarcar, y crear una nueva
// escribiendo su nombre y presionando Enter. Las coincidencias van primero y «Crear» al final, así
// Enter sobre lo que ya existe la marca y sobre algo nuevo la crea. Solo las ve quien las pone.
export function SelectorDeEtiquetas(props: Props) {
  const { etiquetas, puestas, alCambiar, abierto, alCambiarAbierto } = props
  const [texto, setTexto] = useState('')
  const [motivo, setMotivo] = useState<string | null>(null)
  const nueva =
    texto.trim() !== '' && !etiquetaConNombre(texto, etiquetas.lista) ? texto.trim() : null
  const lleno = puestas.length >= MAXIMO_DE_ETIQUETAS_POR_LEAD

  function cambiarAbierto(valor: boolean) {
    if (!valor) {
      setTexto('')
      setMotivo(null)
    }
    alCambiarAbierto(valor)
  }

  async function crear() {
    setMotivo(null)
    const creada = await etiquetas.crear(texto)
    if (!creada.ok) {
      setMotivo(creada.motivo)
      return
    }
    setTexto('')
    if (!lleno) {
      alCambiar(creada.etiqueta.id, true)
    }
  }

  return (
    <Popover open={abierto} onOpenChange={cambiarAbierto}>
      {props.disparador ? <PopoverTrigger render={props.disparador} /> : null}
      <PopoverContent align="end" anchor={props.ancla} className="w-72 p-0">
        {/* cmdk nombra el campo con esta etiqueta (`aria-labelledby`). */}
        <Command shouldFilter={false} label="Buscar o crear una etiqueta">
          <CommandInput
            value={texto}
            onValueChange={(valor) => {
              setTexto(valor)
              setMotivo(null)
            }}
            placeholder="Buscar o crear"
          />
          <p className="px-3 pt-1.5 text-(length:--text-xs) text-(--color-ink-soft)">
            Solo las ves tú.
            {lleno ? ` Este lead ya tiene ${MAXIMO_DE_ETIQUETAS_POR_LEAD} de tus etiquetas.` : ''}
          </p>
          {motivo ? (
            <p
              role="alert"
              className="px-3 pt-1 text-(length:--text-xs) text-(--color-peligro-ink)"
            >
              {motivo}
            </p>
          ) : null}
          <OpcionesDeEtiquetas
            visibles={filtrarEtiquetas(etiquetas.lista, texto)}
            puestas={puestas}
            nueva={nueva}
            lleno={lleno}
            enCurso={props.enCurso}
            creando={etiquetas.creando}
            alCambiar={alCambiar}
            alCrear={() => void crear()}
            alGestionar={() => {
              cambiarAbierto(false)
              props.alGestionar()
            }}
          />
        </Command>
      </PopoverContent>
    </Popover>
  )
}
