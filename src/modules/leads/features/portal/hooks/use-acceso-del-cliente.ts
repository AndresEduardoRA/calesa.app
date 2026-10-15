'use client'

import { useEffect, useState } from 'react'
import { leerAccesoDelCliente } from '../../../composicion.client'
import { accesoVigente } from '../../../entities/portal'

// Si el lead tiene el acceso al portal vigente, leído al abrir el panel de transferir (sólo para quien
// lo gestiona: `activo` falso no pide nada). Un error no frena la transferencia: no se avisa.
export function useAccesoVigente(leadId: string, activo: boolean): boolean {
  const [vigente, setVigente] = useState(false)
  useEffect(() => {
    if (!activo) {
      return
    }
    let sigue = true
    void leerAccesoDelCliente(leadId).then((respuesta) => {
      if (sigue) {
        setVigente(respuesta.ok && accesoVigente(respuesta.data))
      }
    })
    return () => {
      sigue = false
      setVigente(false)
    }
  }, [leadId, activo])
  return vigente
}
