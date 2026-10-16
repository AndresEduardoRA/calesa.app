'use client'

import { useState } from 'react'

// El id de intento de un seguimiento nuevo que salió sin red (no se sabe si llegó): queda en la pestaña
// hasta que se guarda o se descarta. Cerrar y reabrir el modal con el borrador («Continuar», o recargar)
// manda el mismo id, así que la base no lo duplica si el primero había llegado. Sin almacenamiento
// (modo privado, sin lugar) se sigue sin esta red de seguridad.
const clave = (leadId: string) => `intento-pendiente:seguimiento-nuevo-${leadId}`

function leerIntentoPendiente(leadId: string): string | null {
  try {
    return window.sessionStorage.getItem(clave(leadId))
  } catch {
    return null
  }
}

function guardarIntentoPendiente(leadId: string, intento: string): void {
  try {
    window.sessionStorage.setItem(clave(leadId), intento)
  } catch {
    // Sin lugar o en modo privado: un reintento tras reabrir llevaría otro id.
  }
}

function olvidarIntentoPendiente(leadId: string): void {
  try {
    window.sessionStorage.removeItem(clave(leadId))
  } catch {
    // Nada que olvidar.
  }
}

// El id de intento de una apertura: al anotar, el pendiente de esta pestaña si lo hay; al editar no
// hace falta (lleva la versión). `quedoPendiente` al salir sin red, `resuelto` al guardar o descartar.
export function useIntento(leadId: string, anotando: boolean) {
  const [intento] = useState(
    () => (anotando ? leerIntentoPendiente(leadId) : null) ?? crypto.randomUUID(),
  )
  return {
    intento,
    quedoPendiente: () => {
      if (anotando) {
        guardarIntentoPendiente(leadId, intento)
      }
    },
    resuelto: () => {
      if (anotando) {
        olvidarIntentoPendiente(leadId)
      }
    },
  }
}
