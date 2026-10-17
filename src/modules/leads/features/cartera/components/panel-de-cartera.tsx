'use client'

import { useRouter } from 'next/navigation'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Drawer } from '@/shared/ui/drawer'
import { PieConSalida } from '@/shared/ui/pie-con-salida'
import { useConsultaDeMedios } from '@/shared/ui/use-consulta-de-medios'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  MENSAJE_DE_SIN_CANDIDATOS,
  avisoDeVehiculos,
  textoDeTransferencia,
  type PersonaDeCartera,
} from '../../../entities/cartera'
import { AvisoDelPortal } from '../../portal/components/aviso-del-portal'
import { useCandidatos } from '../hooks/use-candidatos'
import type { CarteraDelLead } from '../hooks/use-cartera'
import { useElegirPersona, type ModoDePanelDeCartera } from '../hooks/use-elegir-persona'
import { SIN_NUMEROS, type NumerosDeLead } from '@/shared/lib/numeros-de-lead'
import { useNumeroEscrito } from '@/shared/ui/numero-de-lead'
import { ListaDePersonas } from './lista-de-personas'

// Desde acá el panel entra al costado; por debajo es una hoja inferior.
const COSTADO = '(min-width: 640px)'

// `vehiculosVinculados`: los que quien mira ve; con alguno, el panel avisa que el vínculo se los da a
// quien recibe el lead. `vePortal`: quien mira gestiona el acceso del cliente; al transferir, el panel
// lee si está vigente y avisa que el cliente verá a otra persona como su asesor.
type LeadDelPanel = {
  id: string
  nombre: string
  numeros: NumerosDeLead
  vehiculosVinculados: number
  vePortal: boolean
}

const TEXTOS = {
  compartir: {
    titulo: 'Compartir lead',
    accion: 'Compartir',
    enCurso: 'Compartiendo…',
    ayuda: 'Elige con quién lo compartes. Verá sus datos, incluidos los «solo la cartera».',
  },
  transferir: {
    titulo: 'Transferir lead',
    accion: 'Transferir lead',
    enCurso: 'Transfiriendo…',
    ayuda:
      'Elige a quién se lo pasas. La persona que lo tiene ahora seguirá con acceso compartido.',
  },
} as const

type Props = {
  modo: ModoDePanelDeCartera
  abierto: boolean
  alCerrar: () => void
  lead: LeadDelPanel
  cartera: CarteraDelLead
}

function CandidatosOCarga({
  estado,
  reintentar,
  vacio,
}: {
  estado: ReturnType<typeof useCandidatos>['estado']
  reintentar: () => void
  vacio: boolean
}) {
  if (estado.fase === 'cargando') {
    return (
      <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
        Cargando personas…
      </p>
    )
  }
  if (estado.fase === 'error') {
    return (
      <Aviso tono="peligro">
        <p>{estado.error.mensaje}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={reintentar}>
          Reintentar
        </Button>
      </Aviso>
    )
  }
  return vacio ? <Aviso tono="info">{MENSAJE_DE_SIN_CANDIDATOS}</Aviso> : null
}

// Lo de adentro. Se monta al abrir: cada apertura lee a quién se le puede dar y arranca sin elegir.
function Contenido({ modo, alCerrar, lead, cartera }: Omit<Props, 'abierto'>) {
  const router = useRouter()
  const { estado, reintentar } = useCandidatos(lead.id, true)
  const candidatos = estado.fase === 'lista' ? estado.candidatos : []
  const eleccion = useElegirPersona({
    modo,
    leadNombre: lead.nombre,
    candidatos,
    cartera,
    alTerminar: alCerrar,
  })
  const textos = TEXTOS[modo]
  const { persona, error } = eleccion
  // Una persona elegida y todavía sin dar: un aviso que sale de la pantalla («Abrir ficha») pregunta antes de irse.
  useCambiosSinGuardar(persona !== null)

  return (
    <div className="grid gap-4">
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">{textos.ayuda}</p>
      {avisoDeVehiculos(lead.vehiculosVinculados) ? (
        <Aviso tono="info">{avisoDeVehiculos(lead.vehiculosVinculados)}</Aviso>
      ) : null}
      <CandidatosOCarga estado={estado} reintentar={reintentar} vacio={candidatos.length === 0} />
      {candidatos.length > 0 ? (
        <ListaDePersonas
          texto={eleccion.texto}
          alBuscar={eleccion.buscar}
          visibles={eleccion.visibles}
          elegidoId={eleccion.elegidoId}
          alElegir={eleccion.elegir}
        />
      ) : null}
      <AvisoDelPortal
        leadId={lead.id}
        leadNombre={lead.nombre}
        activo={modo === 'transferir' && lead.vePortal}
        destino={persona ? persona.nombre : null}
      />
      {modo === 'transferir' && persona ? (
        <Aviso tono="aviso">
          {textoDeTransferencia(lead.nombre, cartera.cartera as PersonaDeCartera[], persona.nombre)}
        </Aviso>
      ) : null}
      {error ? (
        <Aviso tono="peligro">
          <p>{error.mensaje}</p>
          {error.codigo === 'conflicto' ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                router.refresh()
                alCerrar()
              }}
            >
              Recargar
            </Button>
          ) : null}
        </Aviso>
      ) : null}
      <PieConSalida className="sticky -bottom-4 -mx-4 -mb-4 flex flex-wrap justify-end gap-2 border-t border-(--color-line) bg-(--color-surface) p-4">
        <Button variant="ghost" onClick={alCerrar} disabled={cartera.enCurso}>
          Cancelar
        </Button>
        <Button
          onClick={() => void eleccion.confirmar()}
          disabled={cartera.enCurso || persona === null}
        >
          {cartera.enCurso ? textos.enCurso : textos.accion}
        </Button>
      </PieConSalida>
    </div>
  )
}

// El panel para compartir o transferir (`?panel=compartir-lead` / `?panel=transferir-lead`). Sólo se
// abre para quien puede: sin eso no hay botón y la URL no abre nada. Hoja inferior en el celular.
export function PanelDeCartera({ modo, abierto, alCerrar, lead, cartera }: Props) {
  const alCostado = useConsultaDeMedios(COSTADO)
  const aLaVista = useUltimo(abierto ? lead : null)
  const mostrado = abierto ? lead : aLaVista
  const numero = useNumeroEscrito(mostrado?.numeros ?? SIN_NUMEROS)
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={TEXTOS[modo].titulo}
      descripcion={
        mostrado ? [mostrado.nombre, numero.principal].filter(Boolean).join(' · ') : undefined
      }
      lado={alCostado ? 'right' : 'bottom'}
    >
      {mostrado ? (
        <Contenido modo={modo} alCerrar={alCerrar} lead={mostrado} cartera={cartera} />
      ) : null}
    </Drawer>
  )
}
