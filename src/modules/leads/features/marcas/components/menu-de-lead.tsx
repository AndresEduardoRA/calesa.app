'use client'

import { CarFrontIcon, Trash2Icon } from 'lucide-react'
import { useRef, useState } from 'react'
import { MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'
import {
  ETIQUETA_DE_ACCION_DE_LEAD,
  accionesDeLead,
  type ClaveDeAccionDeLead,
} from '../../../entities/acciones-de-lead'
import type { MarcasDeLead } from '../../../entities/marcas'
import { SelectorDeEtiquetas } from '../../etiquetas/components/selector-de-etiquetas'
import type { Etiquetas } from '../../etiquetas/hooks/use-etiquetas'
import { useEnvioAPapelera } from '../../papelera/hooks/use-envio-a-papelera'
import { useMarcas, type Marcas } from '../hooks/use-marcas'

// Lo que cambia de una superficie a otra del «⋯» de un lead (la fila, la tarjeta del kanban, el resumen y la ficha): la lista y su orden
// son los mismos (`entities/acciones-de-lead.ts`); lo que cambia es qué pasa al elegir cada cosa.
type PropsComunes = {
  leadId: string
  nombre: string
  etiquetas: Etiquetas
  alGestionar: () => void
  // Quien mira puede enviar este lead a la papelera.
  puedeEnviar: boolean
  // Con el lead en la cartera y `leads.editar`: agendar un recordatorio y anotar un seguimiento (abren su modal; qué modal y dónde lo dice
  // cada superficie). Sin esto, no se ofrecen.
  acciones?: { alAnotar: () => void; alAgendar: () => void } | undefined
  // Lo que la papelera hace distinto donde el lead no se queda en pantalla: `alEnviado` (la ficha lleva al listado y el resumen se cierra),
  // y con un vehículo vinculado que quien mira ve, `motivo` la apaga y `alIrAVehiculos` ofrece ir a «Vehículos».
  papelera?: { alEnviado?: () => void; motivo?: string | null; alIrAVehiculos?: () => void }
  // Después de cambiar una marca: el resumen vuelve a leer el lead.
  alMarcar?: () => void
  // El kanban no trae las marcas ni la cartera del lead: se leen al abrir el menú (`alAbrir`) y mientras tanto, o si no llegan, el menú
  // lo dice (`carga`).
  alAbrir?: () => void
  carga?: { cargando: boolean; aviso: string | null }
}

type Lineas = {
  marcas: Marcas
  envio: ReturnType<typeof useEnvioAPapelera>
  abrirEtiquetas: () => void
} & Pick<PropsComunes, 'leadId' | 'acciones' | 'papelera' | 'alMarcar' | 'carga'>

const sinAccion = () => undefined

type Constructor = (p: Lineas) => AccionDeMenu[]

// Cada acción de la lista, con lo que hace en esta superficie.
const LINEAS: Readonly<Record<ClaveDeAccionDeLead, Constructor>> = {
  agendar: (p) => [
    {
      tipo: 'accion',
      clave: 'agendar',
      etiqueta: ETIQUETA_DE_ACCION_DE_LEAD.agendar,
      despuesDeCerrar: true,
      alElegir: p.acciones?.alAgendar ?? sinAccion,
    },
  ],
  anotar: (p) => [
    {
      tipo: 'accion',
      clave: 'anotar',
      etiqueta: ETIQUETA_DE_ACCION_DE_LEAD.anotar,
      despuesDeCerrar: true,
      alElegir: p.acciones?.alAnotar ?? sinAccion,
    },
  ],
  etiquetas: (p) => [
    {
      tipo: 'accion',
      clave: 'etiquetas',
      etiqueta: ETIQUETA_DE_ACCION_DE_LEAD.etiquetas,
      despuesDeCerrar: true,
      alElegir: p.abrirEtiquetas,
    },
  ],
  favorito: (p) => [
    {
      tipo: 'casilla',
      clave: 'favorito',
      etiqueta: ETIQUETA_DE_ACCION_DE_LEAD.favorito,
      marcada: p.marcas.marcas.esFavorito,
      deshabilitada: p.marcas.enCurso.favorito,
      alCambiar: (valor) => void p.marcas.favorito(valor).then(p.alMarcar),
    },
  ],
  tachado: (p) => [
    {
      tipo: 'casilla',
      clave: 'tachado',
      etiqueta: ETIQUETA_DE_ACCION_DE_LEAD.tachado,
      marcada: p.marcas.marcas.estaTachado,
      deshabilitada: p.marcas.enCurso.tachado,
      cierra: true,
      alCambiar: (valor) => void p.marcas.tachado(valor).then(p.alMarcar),
    },
  ],
  papelera: (p) => {
    const motivo = p.papelera?.motivo ?? null
    const enviar: AccionDeMenu = {
      tipo: 'accion',
      clave: 'papelera',
      etiqueta: ETIQUETA_DE_ACCION_DE_LEAD.papelera,
      icono: <Trash2Icon aria-hidden />,
      destructiva: true,
      deshabilitada: p.envio.enCurso || motivo !== null,
      alElegir: () => {
        void p.envio.enviar([p.leadId]).then((entro) => {
          if (entro) {
            p.papelera?.alEnviado?.()
          }
        })
      },
    }
    if (motivo === null) {
      return [enviar]
    }
    // Con un vehículo vinculado se ve apagada, con el motivo, y ofrece ir a «Vehículos».
    return [
      enviar,
      { tipo: 'nota', clave: 'motivo-papelera', texto: motivo },
      {
        tipo: 'accion',
        clave: 'ir-a-vehiculos',
        etiqueta: 'Ir a «Vehículos»',
        icono: <CarFrontIcon aria-hidden />,
        alElegir: p.papelera?.alIrAVehiculos ?? sinAccion,
      },
    ]
  },
}

// Las líneas del «⋯», en el orden de la lista única y con un separador entre bloques.
function lineasDelMenu(p: Lineas, puedeEnviar: boolean): AccionDeMenu[] {
  const { carga } = p
  if (carga?.aviso) {
    return [{ tipo: 'nota', clave: 'aviso', texto: carga.aviso }]
  }
  if (carga?.cargando) {
    return [{ tipo: 'nota', clave: 'cargando', texto: 'Cargando…' }]
  }
  const bloques = accionesDeLead({ actuar: p.acciones !== undefined, enviar: puedeEnviar })
  return bloques.flatMap((bloque, indice) => [
    ...(indice > 0 ? [{ tipo: 'separador' as const, clave: `separador-${String(indice)}` }] : []),
    ...bloque.flatMap((clave) => LINEAS[clave](p)),
  ])
}

type PropsConMarcas = PropsComunes & {
  // Las marcas de quien mira sobre este lead, con lo que se ve mientras viaja cada pedido (`useMarcas`).
  marcas: Marcas
}

// El «⋯» de un lead con sus marcas ya en un `useMarcas`: la ficha las comparte con las insignias de su cabecera. «Etiquetas…» cierra el
// menú y abre el selector contra el mismo botón; agendar y anotar abren su modal y el foco vuelve a este botón. Nada de lo que pasa adentro
// abre la fila ni la tarjeta de la lista (`<MasAcciones>`).
export function MenuDeLeadConMarcas(props: PropsConMarcas) {
  const { marcas, leadId, nombre, etiquetas, alGestionar, puedeEnviar, alAbrir } = props
  const envio = useEnvioAPapelera()
  const boton = useRef<HTMLButtonElement>(null)
  const [selector, setSelector] = useState(false)
  const lista = lineasDelMenu(
    {
      marcas,
      envio,
      leadId,
      acciones: props.acciones,
      papelera: props.papelera,
      alMarcar: props.alMarcar,
      carga: props.carga,
      abrirEtiquetas: () => {
        setSelector(true)
      },
    },
    puedeEnviar,
  )
  return (
    <MasAcciones nombre={nombre} id={leadId} acciones={lista} botonRef={boton} alAbrir={alAbrir}>
      <SelectorDeEtiquetas
        etiquetas={etiquetas}
        puestas={marcas.marcas.etiquetas}
        alCambiar={(id, valor) => void marcas.etiqueta(id, valor).then(props.alMarcar)}
        enCurso={marcas.enCurso.etiquetas}
        alGestionar={alGestionar}
        abierto={selector}
        alCambiarAbierto={setSelector}
        ancla={boton}
      />
    </MasAcciones>
  )
}

type PropsDeLaFila = PropsComunes & { marcas: MarcasDeLead }

// El «⋯» de un lead de una lista, de una tarjeta o de un resumen: lleva sus propias marcas (las de la fila).
export function MenuDeLead({ marcas: inicial, ...resto }: PropsDeLaFila) {
  const marcas = useMarcas(resto.leadId, inicial)
  return <MenuDeLeadConMarcas {...resto} marcas={marcas} />
}
