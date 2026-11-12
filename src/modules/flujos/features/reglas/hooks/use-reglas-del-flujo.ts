'use client'

import { useState } from 'react'
import { avisarConDeshacer } from '@/shared/ui/toasts'
import type { ReglaDelCatalogo } from '../../../entities/reglas/catalogo'
import type { ImpactoDeRegla } from '../../../entities/reglas/impacto'
import type { EscrituraDeReglas } from './use-escritura-de-reglas'
import { usePedidosDeReglas } from './use-pedidos-de-reglas'

// Encender y apagar reglas, con «Deshacer». Apagar con uso no escribe: la action responde `en_uso` y se muestra qué la usa, bajo la regla. La pantalla
// relee el flujo tras cada cambio (la action revalida) y los interruptores siguen a lo que lee el servidor.
export function useReglasDelFlujo(flujoId: string, escritura: EscrituraDeReglas) {
  const pedir = usePedidosDeReglas()
  const [enUso, setEnUso] = useState<Partial<Record<string, ImpactoDeRegla>>>({})

  function olvidarUso(clave: string) {
    setEnUso((antes) => {
      const { [clave]: _quitada, ...resto } = antes
      return resto
    })
  }

  async function cambiar(regla: ReglaDelCatalogo, activa: boolean) {
    const envio = await escritura.mandar(() =>
      pedir.cambiar(flujoId, escritura.ultimaVersion(), regla.clave, activa),
    )
    if (envio === null) {
      return
    }
    if (!envio.ok) {
      escritura.rechazar(envio)
      return
    }
    if (envio.data.estado === 'en_uso') {
      const { impacto } = envio.data
      setEnUso((antes) => ({ ...antes, [regla.clave]: impacto }))
      return
    }
    escritura.conocer(envio.data.version)
    olvidarUso(regla.clave)
    avisarConDeshacer(`Regla «${regla.nombre}» ${activa ? 'encendida' : 'apagada'}.`, () => {
      void cambiar(regla, !activa)
    })
  }

  return { enUso, cambiar }
}
