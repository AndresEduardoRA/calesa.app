'use client'

import { useMemo } from 'react'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import {
  entradasComoBorrador,
  entradasDelBorrador,
  esDescarte,
  verTotalBsDelBorrador,
  type BorradorDeHoja,
} from '../../../entities/borrador-de-hoja'
import { entradasIniciales, type Entradas, type IndiceDeHoja } from '../../../entities/entradas'

// El borrador de la hoja (4-29) sobre `useBorradorDeEstado` (sin tocarlo): al abrir, lo tipeado y no guardado vuelve contra la hoja de ahora con el aviso «Recuperamos…» y
// «Descartar». Reponer pasa por la misma puerta que una confirmación y saca **un** recálculo: la excepción escrita a «sin efecto que dispare un pedido» (4.13-2). «Descartar»
// no vacía a mano: le pide al marco que vuelva a montar la hoja (`vuelta`), que arranca vacía con la respuesta de la página y deja morir el recálculo que iba en camino.
export function useBorradorDeHoja({
  clave,
  entradas,
  verTotalBs,
  ofrece,
  indice,
  reponer,
  alDescartar,
}: {
  // Nula: sin borrador (una hoja de prueba suelta).
  clave: string | null
  entradas: Entradas
  verTotalBs: boolean
  // La hoja ofrece «Ver total Bs»: si no, el borrador no lo enciende.
  ofrece: boolean
  indice: IndiceDeHoja
  reponer: (e: Entradas, verTotalBs: boolean) => void
  alDescartar: () => void
}): void {
  const valores = useMemo(() => entradasComoBorrador(entradas, verTotalBs), [entradas, verTotalBs])
  // La hoja recién abierta (con el primer modo marcado): «Descartar» y abrir sin tocar nada no dejan borrador.
  const vacio = useMemo(() => entradasComoBorrador(entradasIniciales(indice)), [indice])
  useBorradorDeEstado<BorradorDeHoja>({
    clave: clave ?? '',
    activo: clave !== null,
    valores,
    guardado: vacio,
    alReponer: (cambios) => {
      if (esDescarte(cambios, vacio)) {
        alDescartar()
        return
      }
      const leido = { ...vacio, ...cambios }
      reponer(entradasDelBorrador(leido, indice), verTotalBsDelBorrador(leido, ofrece))
    },
  })
}
