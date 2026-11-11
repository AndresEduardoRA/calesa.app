'use client'

import { enviarAccion } from '@/shared/lib/enviar-accion'
import { ok, type Resultado } from '@/shared/lib/errores'
import { memoriaDeLectura, type MemoriaDeLectura } from '@/shared/lib/memoria-de-lectura'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import type { OpcionesDeRequisitos } from '../../../entities/requisitos/opciones'
import { leerOpcionesDeRequisitos } from '../actions/leer-opciones'

// Los tipos de documento casi no cambian: lo leído de un flujo vale un minuto y se comparte entre aperturas del inspector.
const VIDA_DE_LAS_OPCIONES_MS = 60_000
const memorias = new Map<string, MemoriaDeLectura<OpcionesDeRequisitos>>()

async function leer(flujoId: string): Promise<Resultado<OpcionesDeRequisitos>> {
  const envio = await enviarAccion<OpcionesDeRequisitos>(
    leerOpcionesDeRequisitos({ flujoId }),
    'No pudimos leer los tipos de documento.',
  )
  return envio.ok ? ok(envio.data) : { ok: false, error: envio.error }
}

function memoriaDe(flujoId: string): MemoriaDeLectura<OpcionesDeRequisitos> {
  let memoria = memorias.get(flujoId)
  if (!memoria) {
    memoria = memoriaDeLectura(() => leer(flujoId), VIDA_DE_LAS_OPCIONES_MS)
    memorias.set(flujoId, memoria)
  }
  return memoria
}

// Lo que el bloque lee aparte para nombrar los requisitos (hoy, los tipos de documento): una vez al abrirse, por flujo. Mientras llega, las descripciones
// dicen su forma genérica (`opciones` nulo); si falla, el bloque lo dice y ofrece reintentar.
export function useOpcionesDeRequisitos(flujoId: string) {
  const { lectura, reintentar } = useLecturaAlMontar(() => memoriaDe(flujoId).leer(), flujoId)
  return {
    opciones: lectura.estado === 'leido' ? lectura.dato : null,
    fallo: lectura.estado === 'fallo',
    reintentar: () => {
      memoriaDe(flujoId).olvidar()
      reintentar()
    },
  }
}
