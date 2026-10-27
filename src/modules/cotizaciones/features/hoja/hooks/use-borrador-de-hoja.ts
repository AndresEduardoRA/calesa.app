'use client'

import { useMemo } from 'react'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import {
  entradasComoBorrador,
  entradasDelBorrador,
  esDescarte,
  type BorradorDeHoja,
} from '../../../entities/borrador-de-hoja'
import { ENTRADAS_VACIAS, type Entradas, type IndiceDeHoja } from '../../../entities/entradas'

const VACIO: BorradorDeHoja = entradasComoBorrador(ENTRADAS_VACIAS)

// El borrador de la hoja (4-29) sobre `useBorradorDeEstado` (sin tocarlo): al abrir, lo tipeado y no guardado vuelve contra la hoja de ahora con el aviso «Recuperamos…» y
// «Descartar». Reponer pasa por la misma puerta que una confirmación y saca **un** recálculo: la excepción escrita a «sin efecto que dispare un pedido» (4.13-2). «Descartar»
// no vacía a mano: le pide al marco que vuelva a montar la hoja (`vuelta`), que arranca vacía con la respuesta de la página y deja morir el recálculo que iba en camino.
export function useBorradorDeHoja({
  clave,
  entradas,
  indice,
  reponer,
  alDescartar,
}: {
  // Nula: sin borrador (una hoja de prueba suelta).
  clave: string | null
  entradas: Entradas
  indice: IndiceDeHoja
  reponer: (e: Entradas) => void
  alDescartar: () => void
}): void {
  const valores = useMemo(() => entradasComoBorrador(entradas), [entradas])
  useBorradorDeEstado<BorradorDeHoja>({
    clave: clave ?? '',
    activo: clave !== null,
    valores,
    guardado: VACIO,
    alReponer: (cambios) => {
      if (esDescarte(cambios, VACIO)) {
        alDescartar()
        return
      }
      reponer(entradasDelBorrador({ ...VACIO, ...cambios }, indice))
    },
  })
}
