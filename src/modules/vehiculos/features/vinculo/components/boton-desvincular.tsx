'use client'

import { UnlinkIcon } from 'lucide-react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { RUTAS } from '@/shared/lib/rutas'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { salirSinPerder } from '@/shared/ui/salida-con-cambios'
import {
  CLAVE_DE_LUEGO,
  ETIQUETA_DE_AVISO,
  LUEGO_PAPELERA,
  type AvisosDelMenu,
} from '../../../entities/avisos-de-vehiculo'
import { PANEL_DESVINCULAR } from '../../../entities/vehiculos-del-lead'
import { useEnvioAPapelera } from '../../papelera/hooks/use-envio-a-papelera'
import { useVinculo } from '../hooks/use-vinculo'
import { ConfirmarDesvincularDiferido } from './diferidos'

type Props = {
  vehiculo: { id: string; titulo: string; numero: number; actualizadoEn: string }
  origenId: string
  // Si, sin el vínculo, el vehículo iría a la papelera (quien mira lo elimina y no lo frena la fase): sólo entonces `?luego=papelera` lo ofrece.
  ofrecerPapelera: boolean
  // Lo que el aviso ofrece si la base rechaza el envío por otra causa (un comprobante, un pago…).
  avisos?: AvisosDelMenu
}

// «Desvincular» en la ficha del vehículo, para quien lo puede editar (la base lo vuelve a decidir). Es la
// salida cuando el vehículo está vinculado a un lead que quien mira no tiene en su cartera. Pregunta
// antes (`?panel=desvincular`): desde acá no hay «Deshacer» (volver a vincular pide la cartera de ese lead).
// Si se llegó desde el aviso «Está vinculado a un lead» (`?luego=papelera`), el aviso de desvinculado ofrece enviarlo a la papelera.
export function BotonDesvincular({ vehiculo, origenId, ofrecerPapelera, avisos }: Props) {
  const acciones = useVinculo(null)
  const papelera = useEnvioAPapelera()
  const router = useRouter()
  const panel = usePanelPorUrl(PANEL_DESVINCULAR, [CLAVE_DE_LUEGO])
  const montar = useAbiertoAlgunaVez(panel.abierto)
  const conPapelera = ofrecerPapelera && panel.valor(CLAVE_DE_LUEGO) === LUEGO_PAPELERA
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="min-h-11 w-fit md:min-h-8"
        disabled={acciones.enCurso}
        onClick={() => {
          panel.abrir()
        }}
      >
        <UnlinkIcon aria-hidden />
        Desvincular
      </Button>
      {montar ? (
        <ConfirmarDesvincularDiferido
          abierto={panel.abierto}
          vehiculo={vehiculo}
          enCurso={acciones.enCurso}
          alCerrar={panel.cerrar}
          alConfirmar={async () => {
            await acciones.desvincular(vehiculo, {
              deshacer: false,
              ...(conPapelera
                ? {
                    luego: {
                      etiqueta: ETIQUETA_DE_AVISO.enviarAPapelera,
                      alHacer: (actualizadoEn: string) => {
                        void papelera
                          .enviar([{ id: vehiculo.id, actualizadoEn }], avisos)
                          .then((entro) => {
                            if (entro) {
                              salirSinPerder(() => {
                                router.push(`${RUTAS.vehiculos}?origen=${origenId}` as Route)
                              })
                            }
                          })
                      },
                    },
                  }
                : {}),
            })
            panel.cerrar()
          }}
        />
      ) : null}
    </>
  )
}
