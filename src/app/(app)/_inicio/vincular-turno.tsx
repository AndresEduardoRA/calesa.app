'use client'

import { useRouter } from 'next/navigation'
import { parseAsString, useQueryStates } from 'nuqs'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { PanelParaVincularDiferido, CLAVES_DE_LA_BUSQUEDA } from '@/modules/leads/pantallas/turno'
import {
  CLAVE_DE_ELEGIR_TURNO,
  CLAVE_DE_TURNO,
  PANEL_VINCULAR_TURNO,
  confirmarContacto,
} from '@/modules/web/client'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'

type Props = {
  // `leads.crear` y `leads.numero_global.ver`: los decide `page.tsx` con `puede()`, nunca el cliente.
  puedeCrear: boolean
  numeroGlobal: boolean
}

const CLAVES_DEL_PANEL = [CLAVE_DE_TURNO, ...CLAVES_DE_LA_BUSQUEDA]

// «Vincular a lead» de un turno de la web sobre Inicio (8.05-1): el panel de `leads` y la action de `web` los junta `src/app` (un módulo no importa al otro).
// `?panel=vincular-turno&turno=<id>` lo abre; elegir un lead confirma el contacto con él (`web_confirmar_contacto(turno, lead)`), cierra el panel y relee Inicio.
// «+» crea un lead con el alta del shell, que deja al creado en `?vincular=<id>`: con el `turno` aún en la URL se vincula igual y se limpian las dos claves.
export function VincularTurno({ puedeCrear, numeroGlobal }: Props) {
  const router = useRouter()
  const panel = usePanelPorUrl(PANEL_VINCULAR_TURNO, CLAVES_DEL_PANEL)
  const montado = useAbiertoAlgunaVez(panel.abierto)
  const [error, setError] = useState<string | null>(null)
  const enVuelo = useRef(false)
  const [url, escribir] = useQueryStates({
    [CLAVE_DE_TURNO]: parseAsString,
    [CLAVE_DE_ELEGIR_TURNO]: parseAsString,
  })
  const turno = url[CLAVE_DE_TURNO]
  const creado = url[CLAVE_DE_ELEGIR_TURNO]

  async function vincular(solicitud: string, lead: string) {
    if (enVuelo.current) return
    enVuelo.current = true
    setError(null)
    try {
      const envio = await enviarAccion(
        confirmarContacto({ solicitud, lead }),
        'No pudimos vincular el turno al lead.',
      )
      if (envio.ok) {
        panel.cerrar()
        router.refresh()
      } else {
        setError(envio.error.mensaje)
        // Venía del alta (el panel ya estaba cerrado): se reabre para decir por qué no se pudo.
        if (!panel.abierto) panel.abrir({ [CLAVE_DE_TURNO]: solicitud })
      }
    } finally {
      enVuelo.current = false
    }
  }
  const vincularAlCrear = useEffectEvent(vincular)

  // El lead recién creado por «+» vuelve en `?vincular=`: se vincula y se limpian las dos claves (si falla, queda abierto el panel con el motivo).
  useEffect(() => {
    if (creado === null || turno === null) return
    void escribir({ [CLAVE_DE_ELEGIR_TURNO]: null }, { history: 'replace' })
    void vincularAlCrear(turno, creado)
  }, [creado, turno, escribir])

  if (!montado) {
    return null
  }
  return (
    <PanelParaVincularDiferido
      abierto={panel.abierto && turno !== null}
      alCerrar={() => {
        setError(null)
        panel.cerrar()
      }}
      alElegir={(leadId) => {
        if (turno !== null) void vincular(turno, leadId)
      }}
      puedeCrear={puedeCrear}
      numeroGlobal={numeroGlobal}
      claveDeLaUrl={CLAVE_DE_ELEGIR_TURNO}
      error={error}
    />
  )
}
