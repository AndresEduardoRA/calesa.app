'use client'

import { Aviso } from '@/shared/ui/aviso'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import { ZonaDeArchivos } from '@/shared/ui/zona-de-archivos'
import { MENSAJE_ITEM_LLENO, lugarPara } from '../../../entities/items/imagenes'
import type { ResultadoDeAgregar } from '../../../entities/items/imagenes-repositorio'
import { useSubidaDeImagenes } from '../hooks/use-subida-de-imagenes'

type Props = {
  itemId: string
  cuantas: number
  alAgregar: (resultado: ResultadoDeAgregar) => void
}

// Subir imágenes al ítem (8.09-3, C9): elegir, soltar o sacar una foto sube al momento. Lleno (8): la zona se deshabilita y dice por qué. Sin conexión: avisa y deshabilita.
export function SubidaDeImagenes({ itemId, cuantas, alAgregar }: Props) {
  const enLinea = useEnLinea()
  const { subir, enCurso } = useSubidaDeImagenes({ itemId, cuantas, alAgregar })
  const lleno = lugarPara(cuantas) === 0
  return (
    <div className="grid gap-2">
      {lleno ? <Aviso tono="info">{MENSAJE_ITEM_LLENO}</Aviso> : null}
      {enLinea ? null : (
        <Aviso tono="aviso">Sin conexión. Las imágenes se pueden subir cuando vuelva.</Aviso>
      )}
      <ZonaDeArchivos
        aceptar="image/jpeg,image/png,image/webp"
        alElegir={(archivos) => void subir(archivos)}
        etiquetaDeElegir="Elegir imágenes"
        etiquetaDeCamara="Sacar una foto"
        ayuda="Hasta 8 por ítem. Se achican a 1600 px."
        deshabilitada={lleno || enCurso || !enLinea}
      />
      {enCurso ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          Subiendo…
        </p>
      ) : null}
    </div>
  )
}
