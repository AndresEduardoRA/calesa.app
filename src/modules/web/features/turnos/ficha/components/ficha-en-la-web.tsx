'use client'

import { useState } from 'react'
import { Bloque } from '@/shared/ui/bloque'
import type { MiFichaEnLaWeb } from '../../../../entities/turnos/ficha'
import { FormularioDeFichaDiferido } from './diferidos'

// «Tu ficha en la web» en Mi perfil (8.05-2): cómo te presenta la web y cómo te escriben los clientes. Nace plegada y su formulario se monta (y su código se pide) la
// primera vez que se abre: así no pesa en el documento de `/perfil` de quien no la toca. El formulario lleva de `key` la versión del perfil: lo guardado (aquí, en «Tus datos»
// o por quien administra el equipo) lo vuelve a montar desde la base sin cerrar el bloque.
export function FichaEnLaWeb({
  ficha,
  miraOtroRol,
}: {
  ficha: MiFichaEnLaWeb
  miraOtroRol: boolean
}) {
  const [abierta, setAbierta] = useState(false)
  return (
    <Bloque
      titulo="Tu ficha en la web"
      descripcion="Cómo te presenta la web y cómo te escriben los clientes."
      plegado
      onAbrir={() => {
        setAbierta(true)
      }}
    >
      {abierta ? (
        <FormularioDeFichaDiferido
          key={ficha.actualizadoEn}
          ficha={ficha}
          miraOtroRol={miraOtroRol}
        />
      ) : null}
    </Bloque>
  )
}
