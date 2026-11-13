'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { leerAvances } from '../../../composicion.client'
import {
  idsParaSondear,
  SONDEO_MS,
  type ResumenDeImportacion,
} from '../../../entities/resumen-de-importacion'

// Las seguidas que no están en la lista (la recién lanzada, si la recarga todavía no la trajo): nulo hasta la primera lectura.
type Fuera = ReadonlyMap<string, ResumenDeImportacion | null>

// El avance sin realtime (9.06-5, D51): cada 5 s, sólo con alguna en curso (o una seguida sin leer) y la pestaña a la vista, una consulta por
// PK con a lo sumo 21 ids. Si falla, se conserva lo último y se dice por qué (D57); el próximo tic vuelve a intentar.
export function useSondeoDeAvance(
  lista: readonly ResumenDeImportacion[],
  alLeer: (leidas: ResumenDeImportacion[]) => void,
) {
  const [fuera, setFuera] = useState<Fuera>(new Map())
  const [aviso, setAviso] = useState<string | null>(null)
  const enLista = new Set(lista.map((r) => r.id))
  const sinLeer: string[] = []
  const leidasFuera: ResumenDeImportacion[] = []
  for (const [id, r] of fuera) {
    if (enLista.has(id)) continue
    if (r === null) sinLeer.push(id)
    else leidasFuera.push(r)
  }
  const clave = idsParaSondear([...leidasFuera, ...lista], sinLeer).join(',')

  const recibir = useEffectEvent((leidas: ResumenDeImportacion[]) => {
    alLeer(leidas)
    setFuera((previas) => {
      if (!leidas.some((r) => previas.has(r.id))) return previas
      const nuevas = new Map(previas)
      for (const r of leidas) if (nuevas.has(r.id)) nuevas.set(r.id, r)
      return nuevas
    })
  })

  useEffect(() => {
    if (clave === '') return
    const ids = clave.split(',')
    let vivo = true
    const intervalo = setInterval(() => {
      if (document.visibilityState === 'hidden') return
      void leerAvances(ids).then((leido) => {
        if (!vivo) return
        if (!leido.ok) {
          setAviso(leido.error.mensaje)
          return
        }
        setAviso(null)
        recibir(leido.data)
      })
    }, SONDEO_MS)
    return () => {
      vivo = false
      clearInterval(intervalo)
    }
  }, [clave])

  return {
    aviso,
    // Seguir una importación aunque la lista no la tenga (D55: después de lanzar se recarga la lista, que puede fallar).
    seguir: (id: string) => {
      setFuera((previas) => (previas.has(id) ? previas : new Map(previas).set(id, null)))
    },
    fueraDeLaLista: (id: string) => fuera.get(id) ?? null,
  }
}
