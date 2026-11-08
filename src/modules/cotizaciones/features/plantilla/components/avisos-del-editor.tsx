'use client'

import { Aviso } from '@/shared/ui/aviso'
import { AvisosDelFormulario } from '@/shared/ui/avisos-del-formulario'
import type { GuardarLaPlantilla } from '../hooks/use-guardar-la-plantilla'

type Props = {
  // Lo que se corrigió al abrir (C2/C3) y lo de los tonos que ya no están, en ese orden.
  deLaLectura: readonly string[]
  // Lo que `completa` rechaza y la forma no: no apaga «Guardar», avisa que publicar no pasaría.
  paraPublicar: string | null
  guardar: GuardarLaPlantilla
  // La misma URL: se abre en otra pestaña con lo que guardó la otra persona, sin perder lo tipeado.
  hrefVer: string
}

// Lo que el editor dice arriba, en este orden: lo corregido al abrir, lo de los tonos, lo que impediría publicar y lo que pasó al guardar (sin conexión, conflicto, un
// rechazo que no es de un campo).
export function AvisosDelEditor({ deLaLectura, paraPublicar, guardar, hrefVer }: Props) {
  return (
    <>
      {deLaLectura.map((texto) => (
        <Aviso key={texto} tono="aviso">
          {texto}
        </Aviso>
      ))}
      {paraPublicar === null ? null : (
        <Aviso tono="aviso">Con esto no se podría publicar: {paraPublicar}</Aviso>
      )}
      <AvisosDelFormulario
        enLinea={guardar.enLinea}
        esperandoConexion={guardar.esperandoConexion}
        enCurso={guardar.enCurso}
        conflicto={guardar.conflicto}
        aviso={guardar.aviso}
        hrefVer={hrefVer}
        alReintentar={guardar.reintentar}
        alRecargar={guardar.recargar}
      />
    </>
  )
}
