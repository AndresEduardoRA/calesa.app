'use client'

import { Bloque } from '@/shared/ui/bloque'
import { InterruptorConMotivo } from './interruptor-con-motivo'
import type { PropsDeBloque } from './props-de-bloque'

// «Transporte y aduana»: qué se puede registrar en la fase.
export function BloqueTransporte({
  valores,
  errores,
  escribir,
  deshabilitado,
  conError,
  contexto,
}: PropsDeBloque) {
  return (
    <Bloque titulo="Transporte y aduana" plegado forzarAbierto={conError}>
      <InterruptorConMotivo
        deshabilitado={deshabilitado}
        campo="permite_contenedor"
        titulo="Permite contenedor"
        ayuda="Se puede asignar un contenedor a la unidad en esta fase."
        valor={valores.permiteContenedor}
        alCambiar={(permiteContenedor) => {
          escribir({ permiteContenedor }, 'permite_contenedor')
        }}
        error={errores.permite_contenedor}
      />
      <InterruptorConMotivo
        deshabilitado={deshabilitado}
        campo="permite_aduana"
        titulo="Permite aduana"
        ayuda="Se pueden registrar los datos de aduana en esta fase."
        valor={valores.permiteAduana}
        alCambiar={(permiteAduana) => {
          escribir({ permiteAduana }, 'permite_aduana')
        }}
        regla={{ campo: 'permite_aduana', contexto }}
        error={errores.permite_aduana}
      />
      <InterruptorConMotivo
        deshabilitado={deshabilitado}
        campo="cuenta_llegada_repuestos"
        titulo="Llegada de repuestos"
        ayuda="Cuenta como la llegada de los repuestos. Sólo una fase por flujo puede contarla."
        valor={valores.cuentaLlegadaRepuestos}
        alCambiar={(cuentaLlegadaRepuestos) => {
          escribir({ cuentaLlegadaRepuestos }, 'cuenta_llegada_repuestos')
        }}
        error={errores.cuenta_llegada_repuestos}
      />
    </Bloque>
  )
}
