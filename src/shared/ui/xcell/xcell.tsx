'use client'

// La celda de la hoja de cotizar (`docs/COTIZADOR.md` › «Binding con la XCell»). Dibuja y maneja UNA celda a partir de props: no lee la base y
// no calcula nada, dice «esta celda pasó a N» (`onCommit`) o «volver» (`onReset`) y la base recalcula (4.13). Ver `CLAUDE.md` de esta carpeta.
import { memo, useId, useRef, type KeyboardEvent } from 'react'
import { useRegional } from '../regional'
import { CabeceraDeXCell, PARADA_DE_ACCIONES_DESDE } from './cabecera-de-xcell'
import { RAIZ } from './clases'
import { accionesDe, estadosDe, notaDe, type FormatoDeXCell } from './estado'
import { LadoDeXCell } from './lado-de-xcell'
import { NotaDeXCell } from './nota-de-xcell'
import { useEdicion, type DatosDeLado, type Lado } from './use-edicion'

export type XCellProps = {
  // El id del nodo de la fórmula: es lo que `onCommit` y `onReset` devuelven.
  id: string
  label: string
  format: FormatoDeXCell
  currency?: string | undefined
  // Sólo la vista; lo que se edita siempre lleva la precisión completa.
  decimals?: number | undefined
  value: number | null
  // Lo trae una constante o un tipo de cambio. Sin él, ↺ vuelve «al sugerido».
  defaultValue?: number | null | undefined
  suggested: boolean
  // `fuentes[id] === 'override'`: la persona cambió un default o un sugerido.
  overridden: boolean
  // Candado y el motivo escrito; la celda se lee y se alcanza con el teclado, pero no abre la edición.
  disabledReason?: string | undefined
  // La clave de un tono de la empresa; una desconocida cae al neutro.
  tone?: string | undefined
  // El mensaje de la base sobre lo que se guardó (rango, obligatorio): la celda no valida nada de eso.
  error?: string | undefined
  // El par porcentaje–monto es UNA celda con su secundario, editable por los dos lados.
  secondaryId?: string | undefined
  secondaryValue?: number | null | undefined
  secondaryFormat?: FormatoDeXCell | undefined
  secondaryDecimals?: number | undefined
  // La ayuda de la celda (una tabla o un texto: lo que abre lo decide la hoja) y el ⚙ (cambia el valor por defecto, global). Banderas y callbacks
  // aparte: la hoja pasa los MISMOS callbacks a todas las celdas y el `memo` aguanta. La celda no decide permisos y no mueve el foco al accionarlas.
  hasHelp?: boolean | undefined
  hasSettings?: boolean | undefined
  onHelp?: ((id: string) => void) | undefined
  onSettings?: ((id: string) => void) | undefined
  onCommit: (id: string, valor: number | null) => void
  onReset: (id: string) => void
}

function moverParada(raiz: HTMLElement, desde: HTMLElement, paso: 1 | -1) {
  const paradas = [...raiz.querySelectorAll<HTMLElement>('[data-parada]')].sort(
    (a, b) => Number(a.dataset['parada']) - Number(b.dataset['parada']),
  )
  paradas[paradas.indexOf(desde) + paso]?.focus()
}

// El valor de cada lado: el que dice el binding o el del secundario del par.
function datosDeLado(props: XCellProps, lado: Lado): DatosDeLado {
  const { id, format, value, decimals, secondaryId, secondaryFormat } = props
  if (lado === 'principal' || secondaryId === undefined || secondaryFormat === undefined) {
    return { id, formato: format, valor: value, decimales: decimals }
  }
  return {
    id: secondaryId,
    formato: secondaryFormat,
    valor: props.secondaryValue ?? null,
    decimales: props.secondaryDecimals,
  }
}

// Las flechas son de la celda: moverse entre sus paradas. Las acciones no son paradas de Tab (`tabIndex -1`), así Tab va de valor en valor.
function teclasDeLaCelda(evento: KeyboardEvent<HTMLDivElement>, valor: HTMLElement | null) {
  const objetivo = evento.target
  if (!(objetivo instanceof HTMLButtonElement) || objetivo.dataset['parada'] === undefined) {
    return
  }
  if (evento.key === 'ArrowRight' || evento.key === 'ArrowLeft') {
    evento.preventDefault()
    moverParada(evento.currentTarget, objetivo, evento.key === 'ArrowRight' ? 1 : -1)
  } else if (
    evento.key === 'Escape' &&
    Number(objetivo.dataset['parada']) >= PARADA_DE_ACCIONES_DESDE
  ) {
    evento.stopPropagation()
    valor?.focus()
  }
}

function XCellBase(props: XCellProps) {
  const { id, label, currency, suggested, overridden, onReset } = props
  const { locale } = useRegional()
  const uid = useId()
  const principalRef = useRef<HTMLElement | null>(null)

  const bloqueada = props.disabledReason !== undefined && props.disabledReason !== ''
  const hayPar = props.secondaryId !== undefined && props.secondaryFormat !== undefined
  const acciones = accionesDe({ ...props, bloqueada })
  const estados = estadosDe({ suggested, overridden, disabledReason: props.disabledReason })

  const edicion = useEdicion({
    ladoDe: (lado) => datosDeLado(props, lado),
    bloqueada,
    locale,
    onCommit: props.onCommit,
  })
  const nota = notaDe(edicion.edicion?.invalido === true, props.error, props.disabledReason)
  const idDeLaNota = nota === undefined ? undefined : `${uid}n`

  const lado = (cual: Lado) => (
    <LadoDeXCell
      lado={cual}
      datos={datosDeLado(props, cual)}
      etiqueta={label}
      moneda={currency}
      idDelBoton={`${uid}${cual === 'principal' ? 'p' : 's'}`}
      idDeLaEtiqueta={`${uid}e`}
      idDeLaNota={idDeLaNota}
      bloqueada={bloqueada}
      conAtajo={acciones.hay}
      principalRef={principalRef}
      edicion={edicion}
    />
  )

  return (
    <div
      role="group"
      aria-label={label}
      data-xcell=""
      data-tono={props.tone}
      data-estado={estados}
      className={`group/xc ${RAIZ}`}
      onKeyDown={(evento) => {
        teclasDeLaCelda(evento, principalRef.current)
      }}
    >
      <CabeceraDeXCell
        idDeLaEtiqueta={`${uid}e`}
        label={label}
        sugerido={estados.includes('sugerido')}
        alAyudar={acciones.alAyudar}
        alAjustar={acciones.alAjustar}
        restablecer={acciones.restablecer}
        alRestablecer={() => {
          // El foco pasa al valor antes de que ↺ desaparezca.
          principalRef.current?.focus()
          onReset(id)
        }}
      />
      {lado('principal')}
      {hayPar ? lado('secundario') : null}
      {nota === undefined || idDeLaNota === undefined ? null : (
        <NotaDeXCell id={idDeLaNota} nota={nota} />
      )}
    </div>
  )
}

export const XCell = memo(XCellBase)
