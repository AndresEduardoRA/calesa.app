'use client'

import { Bloque } from '@/shared/ui/bloque'
import { Campo } from '@/shared/ui/campo'
import { ID_DE_CAMPO_DE_FASE } from '../../../entities/fases/bloques-de-fase'
import {
  LARGO_MAXIMO_DE_LA_DESCRIPCION_DE_FASE,
  LARGO_MAXIMO_DEL_ALIAS_DE_FASE,
} from '../../../entities/fases/reglas-de-fase'
import { CampoDeTextoLargo } from './campo-de-texto-largo'
import { InterruptorConMotivo } from './interruptor-con-motivo'
import type { PropsDeBloque } from './props-de-bloque'

// «Web y portal»: lo que ven afuera. El nombre para el cliente es obligatorio si la fase es visible en el portal (D25); apagar «Visible en el portal» no lo
// borra.
export function BloqueWebYPortal({
  valores,
  errores,
  escribir,
  deshabilitado,
  conError,
  contexto,
}: PropsDeBloque) {
  return (
    <Bloque titulo="Web y portal" plegado forzarAbierto={conError}>
      <InterruptorConMotivo
        deshabilitado={deshabilitado}
        campo="publica_web"
        titulo="Se publica en la web"
        ayuda="La fase aparece en la vitrina pública."
        valor={valores.publicaWeb}
        alCambiar={(publicaWeb) => {
          escribir({ publicaWeb }, 'publica_web')
        }}
        regla={{ campo: 'publica_web', contexto }}
        error={errores.publica_web}
      />
      <InterruptorConMotivo
        deshabilitado={deshabilitado}
        campo="visible_portal"
        titulo="Visible en el portal"
        ayuda="El cliente ve la fase en su portal."
        valor={valores.visiblePortal}
        alCambiar={(visiblePortal) => {
          escribir({ visiblePortal }, 'visible_portal')
        }}
        regla={{ campo: 'visible_portal', contexto }}
        error={errores.visible_portal}
      />
      <Campo
        nombre={ID_DE_CAMPO_DE_FASE.alias_portal}
        etiqueta={
          valores.visiblePortal
            ? 'Nombre para el cliente (obligatorio si es visible)'
            : 'Nombre para el cliente'
        }
        autoComplete="off"
        disabled={deshabilitado}
        maxLength={LARGO_MAXIMO_DEL_ALIAS_DE_FASE + 20}
        value={valores.aliasPortal}
        onChange={(evento) => {
          escribir({ aliasPortal: evento.target.value }, 'alias_portal')
        }}
        error={errores.alias_portal}
      />
      <CampoDeTextoLargo
        nombre={ID_DE_CAMPO_DE_FASE.descripcion_portal}
        etiqueta="Descripción para el cliente"
        disabled={deshabilitado}
        maxLength={LARGO_MAXIMO_DE_LA_DESCRIPCION_DE_FASE + 100}
        value={valores.descripcionPortal}
        onChange={(evento) => {
          escribir({ descripcionPortal: evento.target.value }, 'descripcion_portal')
        }}
        error={errores.descripcion_portal}
      />
    </Bloque>
  )
}
