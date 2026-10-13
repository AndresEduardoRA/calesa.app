'use client'

import { useEffect, useReducer, useRef } from 'react'
import { prepararFoto } from '../../../composicion.client'
import { mensajeDeRechazo, motivoPorArchivo } from '../../../entities/seleccion-de-fotos'
import { reducirBandeja } from '../bandeja'
import { enTandas } from '../tandas'

// Decodificar una foto de 12 megapíxeles ocupa ~50 MB mientras dura: de a dos en un celular.
const LECTURAS_A_LA_VEZ = 2

// Lo que la persona eligió para subir. Elegir no sube nada: cada archivo se lee una vez (de ahí
// salen su hash, sus dos tamaños y la vista previa) y queda esperando a que se confirme.
export function useBandejaDeFotos() {
  const [bandeja, despachar] = useReducer(reducirBandeja, [])

  // Las vistas previas son direcciones locales: se sueltan cuando su ítem sale de la bandeja.
  // Se compara contra lo último dibujado, no contra lo último creado: una vista recién hecha
  // todavía no está en la bandeja y no se debe soltar.
  const dibujadas = useRef<string[]>([])
  useEffect(() => {
    const vigentes = bandeja.flatMap((item) => item.vista ?? [])
    for (const vista of dibujadas.current) {
      if (!vigentes.includes(vista)) {
        URL.revokeObjectURL(vista)
      }
    }
    dibujadas.current = vigentes
  }, [bandeja])
  useEffect(
    () => () => {
      for (const vista of dibujadas.current) {
        URL.revokeObjectURL(vista)
      }
    },
    [],
  )

  function elegir(archivos: readonly File[]) {
    const elegidos = archivos.map((archivo) => {
      const motivo = motivoPorArchivo({
        nombre: archivo.name,
        tipo: archivo.type,
        peso: archivo.size,
      })
      return {
        clave: crypto.randomUUID(),
        archivo,
        motivo: motivo ? mensajeDeRechazo(motivo, archivo.size) : null,
      }
    })
    despachar({
      tipo: 'elegidas',
      items: elegidos.map(({ clave, archivo, motivo }) => ({
        clave,
        nombre: archivo.name,
        motivo,
      })),
    })
    const legibles = elegidos.filter((elegido) => elegido.motivo === null)
    void enTandas(legibles, LECTURAS_A_LA_VEZ, async ({ clave, archivo }) => {
      const leida = await prepararFoto(archivo)
      if (!leida.ok) {
        despachar({ tipo: 'rechazada', clave, motivo: leida.error.mensaje })
        return
      }
      const vista = URL.createObjectURL(leida.data.miniatura.contenido)
      despachar({ tipo: 'preparada', clave, preparada: leida.data, vista })
    })
  }

  return { bandeja, despachar, elegir }
}
