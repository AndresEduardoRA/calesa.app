'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import { duenoDe, type PersonaDeCartera, type RespuestaDeCartera } from '../../../entities/cartera'
import { MENSAJE_DE_LEAD_NO_DISPONIBLE } from '../../../entities/ficha'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { compartirLead } from '../actions/compartir-lead'
import { quitarAcceso } from '../actions/quitar-acceso'
import { salirDelLead } from '../actions/salir-del-lead'
import { transferirLead } from '../actions/transferir-lead'

// Lo que identifica la cartera que trae la página: si cambia (otra persona la movió y se volvió a
// leer), la lista local se vuelve a sembrar con lo que llegó.
function firmaDe(cartera: readonly PersonaDeCartera[]): string {
  return cartera.map((p) => `${p.usuarioId}:${p.tipoAcceso}`).join(',')
}

// El lead ya no se ve para quien mira (se lo quitaron, se fue a la papelera): hay que volver a leer.
function sePerdioElLead(envio: Envio<RespuestaDeCartera>): boolean {
  return !envio.ok && !('sinRed' in envio) && envio.error.mensaje === MENSAJE_DE_LEAD_NO_DISPONIBLE
}

// La cartera local que sigue a cada respuesta: la que trajo, o la de antes.
function carteraTras(
  envio: Envio<RespuestaDeCartera>,
  antes: PersonaDeCartera[],
): PersonaDeCartera[] {
  return envio.ok && envio.data.cartera ? envio.data.cartera : antes
}

// «Deshacer» de quitar un acceso: volver a compartir; si ya no se puede, se dice.
async function volverACompartir(
  compartir: (usuarioId: string) => Promise<Envio<RespuestaDeCartera>>,
  usuarioId: string,
) {
  const vuelta = await compartir(usuarioId)
  if (!vuelta.ok) {
    avisarError(vuelta.error)
  }
}

// Quién tiene el lead y los cuatro movimientos. Cada pedido trae la cartera como quedó: se dibuja
// sin volver a leer la ficha, y la ficha se vuelve a pedir en segundo plano (la cabecera dice quién
// lo tiene). Repetir un pedido es `sin_cambios`.
export function useCartera(leadId: string, inicial: readonly PersonaDeCartera[]) {
  const router = useRouter()
  const firma = firmaDe(inicial)
  const [visto, setVisto] = useState(firma)
  const [cartera, setCartera] = useState<PersonaDeCartera[]>([...inicial])
  if (visto !== firma) {
    setVisto(firma)
    setCartera([...inicial])
  }
  const acciones = {
    compartir: useAction(compartirLead),
    transferir: useAction(transferirLead),
    quitar: useAction(quitarAcceso),
    salir: useAction(salirDelLead),
  }

  function aplicar(envio: Envio<RespuestaDeCartera>) {
    setCartera((antes) => carteraTras(envio, antes))
    if (envio.ok || sePerdioElLead(envio)) {
      router.refresh()
    }
    return envio
  }

  const compartir = async (usuarioId: string) =>
    aplicar(
      await enviarAccion<RespuestaDeCartera>(
        acciones.compartir.executeAsync({ leadId, usuarioId }),
        MENSAJE_DE_VALIDACION,
      ),
    )

  const transferir = async (destinoId: string) =>
    aplicar(
      await enviarAccion<RespuestaDeCartera>(
        acciones.transferir.executeAsync({
          leadId,
          destinoId,
          duenoEsperadoId: duenoDe(cartera)?.usuarioId ?? null,
        }),
        MENSAJE_DE_VALIDACION,
      ),
    )

  // Se hace y ofrece «Deshacer» (volver a compartir): es reversible.
  async function quitar(persona: PersonaDeCartera) {
    const envio = aplicar(
      await enviarAccion<RespuestaDeCartera>(
        acciones.quitar.executeAsync({ leadId, usuarioId: persona.usuarioId }),
        MENSAJE_DE_VALIDACION,
      ),
    )
    if (!envio.ok) {
      avisarError(envio.error)
    } else if (envio.data.resultado === 'revocado') {
      avisarConDeshacer(`Se le quitó el acceso a ${persona.nombre}.`, () => {
        void volverACompartir(compartir, persona.usuarioId)
      })
    }
  }

  // Salir no se deshace: ya no lo ve.
  async function salir() {
    const envio = await enviarAccion<RespuestaDeCartera>(
      acciones.salir.executeAsync({ leadId }),
      MENSAJE_DE_VALIDACION,
    )
    if (envio.ok) {
      avisarExito('Saliste del lead.')
      router.push(RUTAS.leads as never)
    } else if (sePerdioElLead(envio)) {
      router.refresh()
    }
    return envio
  }

  return {
    cartera,
    enCurso: Object.values(acciones).some((accion) => accion.isPending),
    compartir,
    transferir,
    quitar,
    salir,
  }
}

export type CarteraDelLead = ReturnType<typeof useCartera>
