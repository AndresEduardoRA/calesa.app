'use client'

import { Bloque } from '@/shared/ui/bloque'
import { Campo } from '@/shared/ui/campo'
import { SelectorDeIcono } from '@/shared/ui/selector-de-icono'
import { ID_DE_CAMPO_DE_FASE } from '../../../entities/fases/bloques-de-fase'
import {
  LARGO_MAXIMO_DE_LA_DESCRIPCION_DE_FASE,
  LARGO_MAXIMO_DEL_NOMBRE_DE_FASE,
} from '../../../entities/fases/reglas-de-fase'
import { CampoDeTextoLargo } from './campo-de-texto-largo'
import type { PropsDeBloque } from './props-de-bloque'
import { SelectorDeColor } from './selector-de-color'

// «Identidad»: cómo se ve y se llama la fase. Abierto por omisión.
export function BloqueIdentidad({
  valores,
  errores,
  escribir,
  deshabilitado,
  conError,
}: PropsDeBloque) {
  return (
    <Bloque titulo="Identidad" forzarAbierto={conError}>
      <Campo
        nombre={ID_DE_CAMPO_DE_FASE.nombre}
        etiqueta="Nombre"
        autoComplete="off"
        disabled={deshabilitado}
        maxLength={LARGO_MAXIMO_DEL_NOMBRE_DE_FASE + 20}
        value={valores.nombre}
        onChange={(evento) => {
          escribir({ nombre: evento.target.value }, 'nombre')
        }}
        error={errores.nombre}
      />
      <CampoDeTextoLargo
        nombre={ID_DE_CAMPO_DE_FASE.descripcion}
        etiqueta="Descripción"
        disabled={deshabilitado}
        maxLength={LARGO_MAXIMO_DE_LA_DESCRIPCION_DE_FASE + 100}
        value={valores.descripcion}
        onChange={(evento) => {
          escribir({ descripcion: evento.target.value }, 'descripcion')
        }}
        error={errores.descripcion}
        ayuda="Para quien configura el flujo; el cliente no la ve."
      />
      <SelectorDeColor
        valor={valores.color}
        idDelPrimero={ID_DE_CAMPO_DE_FASE.color}
        error={errores.color}
        deshabilitado={deshabilitado}
        alElegir={(color) => {
          escribir({ color }, 'color')
        }}
      />
      <SelectorDeIcono
        valor={valores.icono}
        idDelPrimero={ID_DE_CAMPO_DE_FASE.icono}
        error={errores.icono}
        deshabilitado={deshabilitado}
        alElegir={(icono) => {
          escribir({ icono: icono ?? '' }, 'icono')
        }}
      />
    </Bloque>
  )
}
