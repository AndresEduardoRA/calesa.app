'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { leerVistos, registrarVisto } from '../../../composicion.client'
import {
  conAbierto,
  marcaDeVisto,
  SIN_VISTOS,
  unidas,
  type LecturaDeVistos,
  type MarcaDeVisto,
  type ModuloDeVistos,
  type TipoDeVistos,
} from '../../../entities/vistos'
import { usePreferenciaDeVistos } from '../components/proveedor-de-vistos'

// Las marcas de una página de una lista: una lectura por página (`vistos_de`, con los ids que se dibujan) y, al abrir una fila, la marca al
// instante y el registro en la base (que no vuelve a escribir el mismo dentro de 30 s). Con «Vistos» apagado ni lee ni escribe.
export function useVistos(modulo: ModuloDeVistos, tipo: TipoDeVistos, ids: readonly string[]) {
  const preferencia = usePreferenciaDeVistos()
  // Lo leído de la base y lo abierto en esta pestaña, aparte: una lectura que llega tarde no borra lo recién abierto.
  const [leida, setLeida] = useState<LecturaDeVistos>(SIN_VISTOS)
  const [local, setLocal] = useState<LecturaDeVistos>(SIN_VISTOS)
  const firma = ids.join(',')

  useEffect(() => {
    if (!preferencia.activado || firma === '') return
    let vigente = true
    void leerVistos(modulo, tipo, firma.split(',')).then((nueva) => {
      if (vigente && nueva) setLeida(nueva)
    })
    return () => {
      vigente = false
    }
  }, [modulo, tipo, firma, preferencia.activado])

  const abrir = useCallback(
    (id: string) => {
      if (!preferencia.activado) return
      setLocal((actual) => conAbierto(actual, id))
      void registrarVisto(modulo, tipo, id)
    },
    [modulo, tipo, preferencia.activado],
  )

  const marca = useMemo(
    () =>
      (id: string): MarcaDeVisto =>
        marcaDeVisto(id, unidas(leida, local), preferencia),
    [leida, local, preferencia],
  )
  return { marca, abrir }
}
