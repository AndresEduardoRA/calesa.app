'use client'

import { Trash2Icon } from 'lucide-react'
import { useRef, useState } from 'react'
import { MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'
import {
  ETIQUETA_DE_FAVORITO,
  ETIQUETA_DE_TACHADO,
  type MarcasDeLead,
} from '../../../entities/marcas'
import { ETIQUETA_DE_ENVIAR } from '../../../entities/papelera'
import { SelectorDeEtiquetas } from '../../etiquetas/components/selector-de-etiquetas'
import type { Etiquetas } from '../../etiquetas/hooks/use-etiquetas'
import { useEnvioAPapelera } from '../../papelera/hooks/use-envio-a-papelera'
import { useMarcas } from '../hooks/use-marcas'

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

type Lineas = {
  marcas: ReturnType<typeof useMarcas>
  abrirEtiquetas: () => void
  acciones: Props['acciones']
  envio: { enCurso: boolean; enviar: () => void } | null
}

// Las líneas del «⋯» de una fila, en su orden de hoy.
function lineasDelMenu({ marcas, abrirEtiquetas, acciones, envio }: Lineas): AccionDeMenu[] {
  const lista: AccionDeMenu[] = [
    {
      tipo: 'casilla',
      clave: 'favorito',
      etiqueta: ETIQUETA_DE_FAVORITO,
      marcada: marcas.marcas.esFavorito,
      deshabilitada: marcas.enCurso.favorito,
      alCambiar: (valor) => void marcas.favorito(valor),
    },
    {
      tipo: 'casilla',
      clave: 'tachado',
      etiqueta: ETIQUETA_DE_TACHADO,
      marcada: marcas.marcas.estaTachado,
      deshabilitada: marcas.enCurso.tachado,
      cierra: true,
      alCambiar: (valor) => void marcas.tachado(valor),
    },
    { tipo: 'separador', clave: 'separador-etiquetas' },
    {
      tipo: 'accion',
      clave: 'etiquetas',
      etiqueta: 'Etiquetas…',
      despuesDeCerrar: true,
      alElegir: abrirEtiquetas,
    },
  ]
  if (acciones) {
    lista.push(
      { tipo: 'separador', clave: 'separador-seguimiento' },
      {
        tipo: 'accion',
        clave: 'anotar',
        etiqueta: 'Anotar seguimiento…',
        despuesDeCerrar: true,
        alElegir: acciones.alAnotar,
      },
      {
        tipo: 'accion',
        clave: 'agendar',
        etiqueta: 'Agendar recordatorio…',
        despuesDeCerrar: true,
        alElegir: acciones.alAgendar,
      },
    )
  }
  if (envio) {
    lista.push(
      { tipo: 'separador', clave: 'separador-papelera' },
      {
        tipo: 'accion',
        clave: 'papelera',
        etiqueta: ETIQUETA_DE_ENVIAR,
        icono: <Trash2Icon aria-hidden />,
        deshabilitada: envio.enCurso,
        alElegir: envio.enviar,
      },
    )
  }
  return lista
}

// El «⋯» de una fila del listado: las marcas de quien mira sobre ese lead y, con la cartera, anotar un
// seguimiento y agendar un recordatorio. «Etiquetas…» cierra el menú y abre el selector contra el
// mismo botón; anotar y agendar abren su modal, y el foco vuelve a este botón. Nada de lo que pasa
// adentro abre el drawer de la fila (`<MasAcciones>` frena los clics).
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
  const envio = useEnvioAPapelera()
  const boton = useRef<HTMLButtonElement>(null)
  const [selector, setSelector] = useState(false)

  const lista = lineasDelMenu({
    marcas,
    abrirEtiquetas: () => {
      setSelector(true)
    },
    acciones,
    envio: puedeEnviar
      ? {
          enCurso: envio.enCurso,
          enviar: () => {
            void envio.enviar([leadId])
          },
        }
      : null,
  })

  return (
    <MasAcciones nombre={nombre} id={leadId} acciones={lista} botonRef={boton}>
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
    </MasAcciones>
  )
}
