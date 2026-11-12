'use client'

import { useEffect, useState } from 'react'
import { leerElNavegador, type EstadoDelNavegador } from '../../../composicion.client'

// Lo que sabe este navegador de los avisos push, leído al montar sin pedir permiso ni registrar nada. `null` = revisando.
export function useNavegadorDePush() {
  const [navegador, setNavegador] = useState<EstadoDelNavegador | null>(null)
  const [permisoDenegado, setPermisoDenegado] = useState(false)

  useEffect(() => {
    let vigente = true
    void leerElNavegador().then((estado) => {
      if (vigente) setNavegador(estado)
    })
    return () => {
      vigente = false
    }
  }, [])

  return { navegador, setNavegador, permisoDenegado, setPermisoDenegado }
}
