'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { PANEL_ANOTAR_SEGUIMIENTO } from '../../../entities/edicion-de-seguimiento'
import { CLAVE_DE_SECCION, type LeadDeFicha } from '../../../entities/ficha'
import { motivoParaNoEnviar } from '../../../entities/papelera'
import { PANEL_AGENDAR_RECORDATORIO } from '../../../entities/recordatorios'
import type { Etiquetas } from '../../etiquetas/hooks/use-etiquetas'
import { MenuDeLeadConMarcas } from '../../marcas/components/menu-de-lead'
import type { Marcas } from '../../marcas/hooks/use-marcas'
import { BotonEditarLead } from './boton-editar-lead'

type Props = {
  ficha: LeadDeFicha
  // Las marcas de quien mira, que comparte con las insignias de la cabecera.
  marcas: Marcas
  etiquetas: Etiquetas
  alGestionar: () => void
  puedeEditar: boolean
  puedeEnviarAPapelera: boolean
  // La hoja de cotizar con este lead elegido, en el primer origen donde quien mira cotiza (la compone la página: `leads` no conoce `cotizaciones`); null si no cotiza.
  paraCotizar: string | null
}

// Lo que se puede hacer con el lead desde su cabecera: «Editar», «Cotizar» (sólo a quien cotiza) y el «⋯», con la lista de siempre (`accionesDeLead()`). Anotar y agendar
// viven en «Seguimientos»: se va a esa sección con su modal abierto. Enviar a la papelera se hace y ofrece «Deshacer»; después lleva al
// listado, porque la ficha ya no existe para nadie. Con un vehículo vinculado que quien mira ve, se apaga con el motivo y ofrece ir a
// «Vehículos»; si lo frena uno que no ve, lo dice la base al intentar.
export function AccionesDeLaFicha(props: Props) {
  const { ficha, marcas, etiquetas, alGestionar, puedeEditar, puedeEnviarAPapelera, paraCotizar } =
    props
  const router = useRouter()
  const irA = (url: string) => {
    router.push(url as Route)
  }
  const irAlSeguimiento = (modal: string) => {
    irA(`${RUTAS.leads}/${ficha.id}?${CLAVE_DE_SECCION}=seguimientos&${CLAVE_DE_PANEL}=${modal}`)
  }
  return (
    <>
      {puedeEditar ? <BotonEditarLead /> : null}
      {paraCotizar ? (
        <Link
          href={paraCotizar as Route}
          className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}
        >
          Cotizar
        </Link>
      ) : null}
      <MenuDeLeadConMarcas
        leadId={ficha.id}
        nombre={ficha.nombre}
        marcas={marcas}
        etiquetas={etiquetas}
        alGestionar={alGestionar}
        puedeEnviar={puedeEnviarAPapelera}
        conBorde
        acciones={
          puedeEditar
            ? {
                alAnotar: () => {
                  irAlSeguimiento(PANEL_ANOTAR_SEGUIMIENTO)
                },
                alAgendar: () => {
                  irAlSeguimiento(PANEL_AGENDAR_RECORDATORIO)
                },
              }
            : undefined
        }
        papelera={{
          motivo: motivoParaNoEnviar(ficha.vehiculosVinculados),
          alEnviado: () => {
            irA(RUTAS.leads)
          },
          alIrAVehiculos: () => {
            irA(`${RUTAS.leads}/${ficha.id}?${CLAVE_DE_SECCION}=vehiculos`)
          },
        }}
      />
    </>
  )
}
