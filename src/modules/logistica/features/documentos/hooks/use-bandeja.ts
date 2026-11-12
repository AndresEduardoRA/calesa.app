'use client'

import { useEffect, useRef, useState } from 'react'
import { hashDe } from '@/shared/lib/imagenes'
import {
  PESO_MAXIMO_DEL_DOCUMENTO,
  repartirLaBandeja,
  TOPE_DE_LA_BANDEJA,
  veredictoDelArchivo,
  type ArchivoElegido,
} from '../../../entities/documentos/admision'
import type { TipoDeDocumento } from '../../../entities/documentos/documento'

export type EntradaDeLaBandeja = { archivo: File; datos: ArchivoElegido }
export type Rechazado = { clave: string; nombre: string; motivo: string }
export type ValoresDeLaBandeja = {
  tipoId: string
  emitidoEl: string
  venceEl: string
  nota: string
}

const VACIOS: ValoresDeLaBandeja = { tipoId: '', emitidoEl: '', venceEl: '', nota: '' }

// La bandeja de «Subir documentos» (6.06-2): los archivos elegidos y lo que se dice de ellos, **sin subir nada**. El hash se calcula al elegir (para descartar lo repetido) y lo que el
// tipo elegido no admite sale de la lista y vuelve si se elige otro tipo. Un archivo de más de 25 MB no se lee: ya se sabe que no entra.
export function useBandeja(tipos: readonly TipoDeDocumento[]) {
  const [entradas, setEntradas] = useState<EntradaDeLaBandeja[]>([])
  const [rechazados, setRechazados] = useState<Rechazado[]>([])
  const [valores, setValores] = useState<ValoresDeLaBandeja>(VACIOS)
  const [leyendo, setLeyendo] = useState(false)
  const actuales = useRef({ entradas, valores })
  useEffect(() => {
    actuales.current = { entradas, valores }
  })

  const tipo = tipos.find((t) => t.id === valores.tipoId) ?? null
  const { entran, fuera } = repartirLaBandeja(entradas, tipo)

  async function elegir(archivos: File[]): Promise<void> {
    setLeyendo(true)
    const elegido = tipos.find((t) => t.id === actuales.current.valores.tipoId) ?? null
    const nuevas = [...actuales.current.entradas]
    const hashes = new Set(nuevas.map((e) => e.datos.hash))
    const sinLugar: Rechazado[] = []
    const rechazos: Rechazado[] = []
    for (const [i, archivo] of archivos.entries()) {
      const clave = `${i}-${archivo.name}`
      if (nuevas.length >= TOPE_DE_LA_BANDEJA) {
        sinLugar.push({ clave, nombre: archivo.name, motivo: `Sube de a ${TOPE_DE_LA_BANDEJA}.` })
        continue
      }
      const hash = archivo.size > PESO_MAXIMO_DEL_DOCUMENTO ? '' : await hashDe(archivo)
      const datos = { nombre: archivo.name, mime: archivo.type, bytes: archivo.size, hash }
      const veredicto = veredictoDelArchivo(datos, elegido, hashes)
      if (veredicto.entra) {
        nuevas.push({ archivo, datos })
        hashes.add(hash)
      } else {
        rechazos.push({ clave, nombre: archivo.name, motivo: veredicto.motivo })
      }
    }
    setEntradas(nuevas)
    setRechazados([...rechazos, ...sinLugar])
    setLeyendo(false)
  }

  function quitar(hashes: readonly string[]): void {
    setEntradas((anteriores) => anteriores.filter((e) => !hashes.includes(e.datos.hash)))
  }

  function vaciar(): void {
    setEntradas([])
    setRechazados([])
    setValores(VACIOS)
  }

  return {
    entradas,
    entran,
    fuera,
    rechazados,
    valores,
    tipo,
    leyendo,
    hayArchivos: entradas.length > 0,
    escribir: (cambios: Partial<ValoresDeLaBandeja>) => {
      setValores((anteriores) => ({ ...anteriores, ...cambios }))
    },
    elegir,
    quitar,
    vaciar,
  }
}
