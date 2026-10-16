'use client'

import { useAction } from 'next-safe-action/hooks'
import { useEffect, useRef, useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { avisar } from '@/shared/ui/toasts'
import type { ErrorApp } from '@/shared/lib/errores'
import { motivoDeClave, type AccesoOtorgado } from '../../../entities/portal'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { otorgarPortal } from '../actions/otorgar-portal'

// Lo que se muestra una sola vez: el código y la clave (la escrita o la generada; la generada, sólo con
// símbolos que se dictan, se dice símbolo por símbolo).
export type Otorgado = AccesoOtorgado & { clave: string; generada: boolean }

type Estado = { otorgado: Otorgado | null; error: ErrorApp | null; motivo: string | null }

const INICIAL: Estado = { otorgado: null, error: null, motivo: null }

export const AVISO_DE_CLAVE_PERDIDA =
  'Se dio el acceso, pero cerraste antes de ver la clave. Vuelve a otorgarlo para dictarle una nueva.'

// Lo que queda tras la respuesta: el acceso con la clave a mostrar (la que generó la base o la escrita),
// el motivo junto al campo, o el error.
function estadoTras(
  envio: Envio<AccesoOtorgado & { clave: string | null }>,
  escrita: string | null,
): Estado {
  if (!envio.ok) {
    const motivo = 'porCampo' in envio ? (envio.porCampo?.['clave'] ?? null) : null
    return { otorgado: null, error: motivo ? null : envio.error, motivo }
  }
  const mostrada = envio.data.clave ?? escrita
  if (mostrada === null) {
    return {
      ...INICIAL,
      error: {
        codigo: 'inesperado',
        mensaje: 'No recibimos la clave. Vuelve a otorgar el acceso.',
      },
    }
  }
  return {
    ...INICIAL,
    otorgado: { ...envio.data, clave: mostrada, generada: envio.data.clave !== null },
  }
}

// Cuándo se olvida: al volver a abrir, al pedirlo (`olvidar`) y cuando Next esconde la pantalla en un
// `<Activity>` (el efecto se limpia). Cada olvido cambia la generación: lo que vuelve de un pedido de
// antes no se muestra.
function useOlvido(abierto: boolean, reiniciar: () => void) {
  const generacion = useRef(0)
  const ultimo = useRef(reiniciar)
  useEffect(() => {
    ultimo.current = reiniciar
  })
  const [abiertoVisto, setAbiertoVisto] = useState(abierto)
  if (abierto !== abiertoVisto) {
    setAbiertoVisto(abierto)
    if (abierto) {
      reiniciar()
    }
  }
  // Reabrir antes de que terminara de cerrarse (con «atrás» y «adelante») también es otra generación.
  useEffect(() => {
    if (abierto) {
      generacion.current += 1
    }
  }, [abierto])
  useEffect(
    () => () => {
      generacion.current += 1
      ultimo.current()
    },
    [],
  )
  return {
    generacion,
    olvidar: () => {
      generacion.current += 1
      reiniciar()
    },
  }
}

// Dar o volver a otorgar el acceso. La clave vive sólo en este estado: no va a la URL, no se escribe en
// `console` ni en el almacenamiento del navegador, y se olvida cuando el diálogo termina de cerrarse
// (`olvidar`, al acabar la animación: mientras se va sigue mostrando lo mismo), al volver a abrirlo y
// cuando Next esconde la pantalla. Una respuesta que llega después de olvidar (se cerró con «atrás»
// mientras otorgaba) se descarta: no reaparece al reabrir.
export function useOtorgarPortal({
  leadId,
  version,
  abierto,
}: {
  leadId: string
  // La versión del acceso que la persona ve (nula si no hay).
  version: string | null
  abierto: boolean
}) {
  const accion = useAction(otorgarPortal)
  const [clave, setClave] = useState('')
  const [estado, setEstado] = useState<Estado>(INICIAL)
  // Un conflicto se va cuando llega la versión nueva (la trae «Recargar»), no al pulsarlo: si se borrara
  // antes, otorgar en ese instante mandaría la vieja y volvería a chocar.
  const [versionVista, setVersionVista] = useState(version)
  if (versionVista !== version) {
    setVersionVista(version)
    if (estado.error?.codigo === 'conflicto') {
      setEstado((e) => ({ ...e, error: null }))
    }
  }
  const { generacion, olvidar } = useOlvido(abierto, () => {
    setClave('')
    setEstado(INICIAL)
  })
  // Un pedido a la vez, con una marca propia: un doble Enter llega antes de que `isExecuting` cambie y
  // otorgaría dos veces (la primera clave quedaría a la vista sin valer).
  const enVuelo = useRef(false)

  // Un solo botón: con el campo vacío la base genera la clave; con algo escrito, se da esa (antes se
  // mira la regla, sin ir al servidor).
  async function otorgar() {
    const escrita = clave === '' ? null : clave
    const motivo = escrita === null ? null : motivoDeClave(escrita)
    if (motivo) {
      setEstado({ ...INICIAL, motivo })
      return
    }
    if (enVuelo.current) {
      return
    }
    enVuelo.current = true
    setEstado(INICIAL)
    const esta = generacion.current
    const envio = await enviarAccion(
      accion.executeAsync({ leadId, clave: escrita, otorgadoEnEsperado: version }),
      MENSAJE_DE_VALIDACION,
    ).finally(() => {
      enVuelo.current = false
    })
    if (esta !== generacion.current) {
      // Se cerró mientras otorgaba: la clave no se muestra fuera de su diálogo, pero el acceso cambió.
      if (envio.ok) {
        avisar(AVISO_DE_CLAVE_PERDIDA)
      }
      return
    }
    const siguiente = estadoTras(envio, escrita)
    if (siguiente.otorgado) {
      setClave('')
    }
    setEstado(siguiente)
  }

  return {
    clave,
    escribir: (valor: string) => {
      setClave(valor)
      if (estado.motivo) {
        setEstado((e) => ({ ...e, motivo: null }))
      }
    },
    otorgar,
    olvidar,
    enCurso: accion.isExecuting,
    // Tras un conflicto no se otorga hasta tener la versión nueva; lo escrito queda.
    esperaVersion: estado.error?.codigo === 'conflicto',
    ...estado,
  }
}
