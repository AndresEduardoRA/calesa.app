'use client'

import { useId } from 'react'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { Interruptor } from '@/shared/ui/interruptor'
import {
  ETIQUETA_DE_TIPO_DE_CAMPO,
  TIPOS_DE_CAMPO,
  tieneOpciones,
  type CampoDeLayout,
  type OpcionDeCampo,
  type TipoDeCampo,
  type ValorDefecto,
} from '../../../entities/campo'
import { MOTIVO_CAMPO_DE_SISTEMA } from '../../../entities/motivos'
import { CampoValorDefecto } from './campo-valor-defecto'
import { EditorDeOpciones } from './editor-de-opciones'

// Lo que el formulario de un campo edita.
export type ValoresDeCampo = {
  etiqueta: string
  clave: string
  tipo: TipoDeCampo
  opciones: OpcionDeCampo[]
  requerido: boolean
  grupo: string
  enTarjeta: boolean
  filtrable: boolean
  publicoWeb: boolean
  claveApibara: string
  activo: boolean
  valorDefecto: ValorDefecto | null
}

export type ErroresDeCampo = Partial<
  Record<'etiqueta' | 'clave' | 'opciones' | 'grupo' | 'valorDefecto', string>
>

type Props = {
  valores: ValoresDeCampo
  alCambiar: (parcial: Partial<ValoresDeCampo>) => void
  // El campo que se edita, o null al crear uno.
  campo: CampoDeLayout | null
  gruposExistentes: readonly string[]
  errores: ErroresDeCampo
  deshabilitado: boolean
}

const BANDERAS = [
  ['requerido', 'Requerido', 'El vehículo no se guarda sin este dato.'],
  ['enTarjeta', 'En tarjeta', 'Se muestra en la tarjeta del listado.'],
  ['filtrable', 'Filtrable', 'Entra al panel de filtros del listado.'],
  ['publicoWeb', 'Público', 'La web pública puede mostrarlo.'],
] as const

type PropsDeBanderas = {
  valores: ValoresDeCampo
  alCambiar: (parcial: Partial<ValoresDeCampo>) => void
  esNuevo: boolean
  deshabilitado: boolean
}

function Banderas({ valores, alCambiar, esNuevo, deshabilitado }: PropsDeBanderas) {
  return (
    <>
      {BANDERAS.map(([clave, titulo, ayuda]) => (
        <Interruptor
          key={clave}
          titulo={titulo}
          ayuda={ayuda}
          valor={valores[clave]}
          alCambiar={(valor) => {
            alCambiar({ [clave]: valor })
          }}
          deshabilitado={deshabilitado}
        />
      ))}
      {esNuevo ? null : (
        <Interruptor
          titulo="Activo"
          ayuda="Desactivarlo lo saca del formulario y de los filtros; los datos ya cargados se conservan."
          valor={valores.activo}
          alCambiar={(activo) => {
            alCambiar({ activo })
          }}
          deshabilitado={deshabilitado}
        />
      )}
    </>
  )
}

type PropsDeGrupo = {
  valor: string
  alCambiar: (grupo: string) => void
  existentes: readonly string[]
  error: string | undefined
  deshabilitado: boolean
}

// El grupo se escribe libre, con los que ya existen como sugerencia.
function CampoGrupo({ valor, alCambiar, existentes, error, deshabilitado }: PropsDeGrupo) {
  const idGrupos = useId()
  return (
    <div className="grid gap-1.5">
      <Campo
        nombre="grupo"
        etiqueta="Grupo"
        autoComplete="off"
        maxLength={40}
        list={idGrupos}
        value={valor}
        onChange={(evento) => {
          alCambiar(evento.target.value)
        }}
        error={error}
        ayuda="El bloque del formulario donde va. Cambiarlo lo manda al final del grupo."
        disabled={deshabilitado}
      />
      <datalist id={idGrupos}>
        {existentes.map((grupo) => (
          <option key={grupo} value={grupo} />
        ))}
      </datalist>
    </div>
  )
}

// Los datos de un campo del layout. La clave sale de la etiqueta al crear y no cambia después.
export function CamposDeCampo(props: Props) {
  const { valores, alCambiar, campo, gruposExistentes, errores, deshabilitado } = props
  const esNuevo = campo === null
  const tipoFijo = campo?.esSistema ?? false
  return (
    <>
      <Campo
        nombre="etiqueta"
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={60}
        value={valores.etiqueta}
        onChange={(evento) => {
          alCambiar({ etiqueta: evento.target.value })
        }}
        error={errores.etiqueta ?? errores.clave}
        ayuda={
          esNuevo && valores.etiqueta.trim() === ''
            ? 'La clave interna sale del nombre y no cambia después.'
            : `Clave interna: ${valores.clave}${esNuevo ? '. No cambia después.' : '.'}`
        }
        disabled={deshabilitado}
      />
      <CampoSeleccion
        nombre="tipo"
        etiqueta="Tipo"
        opciones={TIPOS_DE_CAMPO.map((tipo) => ({
          valor: tipo,
          etiqueta: ETIQUETA_DE_TIPO_DE_CAMPO[tipo],
        }))}
        value={valores.tipo}
        onChange={(evento) => {
          alCambiar({ tipo: evento.target.value as TipoDeCampo })
        }}
        ayuda={tipoFijo ? MOTIVO_CAMPO_DE_SISTEMA : undefined}
        disabled={deshabilitado || tipoFijo}
      />
      {tieneOpciones(valores.tipo) ? (
        <EditorDeOpciones
          opciones={valores.opciones}
          alCambiar={(opciones) => {
            alCambiar({ opciones })
          }}
          error={errores.opciones}
          deshabilitado={deshabilitado}
        />
      ) : null}
      <CampoValorDefecto
        tipo={valores.tipo}
        opciones={valores.opciones}
        valor={valores.valorDefecto}
        alCambiar={(valorDefecto) => {
          alCambiar({ valorDefecto })
        }}
        error={errores.valorDefecto}
        deshabilitado={deshabilitado}
      />
      <CampoGrupo
        valor={valores.grupo}
        alCambiar={(grupo) => {
          alCambiar({ grupo })
        }}
        existentes={gruposExistentes}
        error={errores.grupo}
        deshabilitado={deshabilitado}
      />
      <Banderas
        valores={valores}
        alCambiar={alCambiar}
        esNuevo={esNuevo}
        deshabilitado={deshabilitado}
      />
    </>
  )
}
