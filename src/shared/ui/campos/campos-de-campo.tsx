'use client'

import { useId } from 'react'
import {
  ETIQUETA_DE_TIPO_DE_CAMPO,
  MOTIVO_CAMPO_DE_FABRICA,
  tieneOpciones,
  type CampoBase,
  type TipoDeCampo,
} from '@/shared/lib/campos'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { Interruptor } from '@/shared/ui/interruptor'
import { CampoValorDefecto } from './campo-valor-defecto'
import { EditorDeOpciones } from './editor-de-opciones'
import type { BanderaDeCampo, ErroresDeCampo, ValoresDeCampo } from './tipos'

type Props = {
  valores: ValoresDeCampo
  alCambiar: (parcial: Partial<Omit<ValoresDeCampo, 'banderas' | 'textos'>>) => void
  alCambiarBandera: (clave: string, valor: boolean) => void
  // El campo que se edita, o null al crear uno.
  campo: CampoBase | null
  banderas: readonly BanderaDeCampo[]
  tipos: readonly TipoDeCampo[]
  gruposExistentes: readonly string[]
  errores: ErroresDeCampo
  deshabilitado: boolean
}

type PropsDeBanderas = {
  valores: ValoresDeCampo
  banderas: readonly BanderaDeCampo[]
  alCambiar: Props['alCambiar']
  alCambiarBandera: Props['alCambiarBandera']
  esNuevo: boolean
  deshabilitado: boolean
}

function Banderas(props: PropsDeBanderas) {
  const { valores, banderas, alCambiar, alCambiarBandera, esNuevo, deshabilitado } = props
  return (
    <>
      {banderas.map(({ clave, etiqueta, ayuda }) => (
        <Interruptor
          key={clave}
          titulo={etiqueta}
          ayuda={ayuda}
          valor={valores.banderas[clave] ?? false}
          alCambiar={(valor) => {
            alCambiarBandera(clave, valor)
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
  const { valores, alCambiar, alCambiarBandera, campo, banderas, tipos } = props
  const { gruposExistentes, errores, deshabilitado } = props
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
        opciones={tipos.map((tipo) => ({
          valor: tipo,
          etiqueta: ETIQUETA_DE_TIPO_DE_CAMPO[tipo],
        }))}
        value={valores.tipo}
        onChange={(evento) => {
          alCambiar({ tipo: evento.target.value as TipoDeCampo })
        }}
        ayuda={tipoFijo ? MOTIVO_CAMPO_DE_FABRICA : undefined}
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
        banderas={banderas}
        alCambiar={alCambiar}
        alCambiarBandera={alCambiarBandera}
        esNuevo={esNuevo}
        deshabilitado={deshabilitado}
      />
    </>
  )
}
