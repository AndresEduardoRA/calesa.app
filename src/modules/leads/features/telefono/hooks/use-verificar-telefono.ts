'use client'

import { useEffect, useRef, useState } from 'react'
import { normalizarTelefono } from '../../../entities/telefono'
import type { Verificacion } from '../../../entities/verificacion'

// Cuánto se espera, sin que la persona siga tipeando, antes de preguntar.
export const ESPERA_DE_VERIFICACION_MS = 400

type Args = {
  // Como se escribió, y el código de país de la empresa: con ellos se calcula el número.
  telefono: string
  codigoDePais: string | null
  // Falso mientras el drawer está cerrado o en el paso del seguimiento.
  activo: boolean
  // Pregunta a la base por el teléfono tal como se escribió: cada pantalla trae su action (el alta,
  // el cambio del principal). `null` = sin veredicto (un rechazo, sin permiso).
  consultar: (telefono: string) => Promise<Verificacion | null>
  // Una cosa que cambia la respuesta sin cambiar el número (la versión del lead, tras «Recargar»):
  // al cambiar, el veredicto guardado se descarta y se vuelve a preguntar.
  validez?: string
}

// «¿Ya existe este teléfono, y de quién es?» al terminar de tipear. Sólo pregunta cuando el número
// ya es un teléfono (el espejo de la base lo dice sin ir al servidor) y la persona dejó de escribir
// 400 ms. La última pregunta gana: una respuesta que llega tarde no pisa la de un número más nuevo.
// Sin red o con un error, no hay veredicto: lo decide la base al guardar.
export function useVerificarTelefono({
  telefono,
  codigoDePais,
  activo,
  consultar,
  validez = '',
}: Args) {
  const normalizado = normalizarTelefono(codigoDePais, telefono)
  const numero = normalizado.ok ? normalizado.numero : null
  const [resultado, setResultado] = useState<{
    numero: string
    validez: string
    verificacion: Verificacion
  } | null>(null)
  const turno = useRef(0)
  const preguntar = useRef(consultar)
  useEffect(() => {
    preguntar.current = consultar
  })
  const escrito = useRef(telefono)
  useEffect(() => {
    escrito.current = telefono
  })

  useEffect(() => {
    if (
      !activo ||
      numero === null ||
      (resultado?.numero === numero && resultado.validez === validez)
    ) {
      return
    }
    const este = ++turno.current
    const espera = setTimeout(() => {
      void (async () => {
        try {
          const dicho = await preguntar.current(escrito.current)
          if (este === turno.current && dicho !== null) {
            setResultado({ numero, validez, verificacion: dicho })
          }
        } catch {
          // Sin red: sigue sin veredicto.
        }
      })()
    }, ESPERA_DE_VERIFICACION_MS)
    return () => {
      clearTimeout(espera)
    }
  }, [activo, numero, validez, resultado])

  const verificacion =
    resultado !== null && resultado.numero === numero && resultado.validez === validez
      ? resultado.verificacion
      : null
  return {
    // El número que se va a guardar (null si lo escrito todavía no es un teléfono).
    numero,
    verificacion,
    // Ya es un teléfono y todavía no hay veredicto.
    verificando: activo && numero !== null && verificacion === null,
    // Lo que dijo la base al guardar: vale para ese número.
    fijar: (para: string, dicho: Verificacion) => {
      setResultado({ numero: para, validez, verificacion: dicho })
    },
  }
}
