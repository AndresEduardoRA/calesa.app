'use client'

import { useId, useRef, useState } from 'react'
import { enfocarPrimerError, errorDeCampo, valoresDe } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { Drawer } from '@/shared/ui/drawer'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { Interruptor } from '@/shared/ui/interruptor'
import { MOTIVO_SIN_PERMISO_TIPOS_CAMBIO } from '../../../entities/motivos'
import { valorTipeado, type CambioDeValor, type TipoCambio } from '../../../entities/tipos-cambio'
import type { EdicionesDeTiposCambio } from '../hooks/use-tipos-cambio'
import { Historial } from './historial'

type Props = {
  // El tipo de cambio de `?tc=`, o null con el panel cerrado.
  tipo: TipoCambio | null
  // Su historial, ya leído en el servidor; null si quien mira no puede verlo.
  historial: readonly CambioDeValor[] | null
  puedeGestionar: boolean
  ediciones: EdicionesDeTiposCambio
  alCerrar: () => void
}

type PropsDelFormulario = Omit<Props, 'tipo' | 'historial' | 'alCerrar'> & {
  tipo: TipoCambio
  idFormulario: string
}

const VALOR_INVALIDO = 'Escribe un valor mayor que cero, con hasta 6 decimales.'

type PropsDeCampos = {
  tipo: TipoCambio
  puedeGestionar: boolean
  errores: EdicionesDeTiposCambio['errores']['guardar']
  valorInvalido: boolean
  activo: boolean
  alCambiarActivo: (activo: boolean) => void
  esDefault: boolean
  alCambiarDefault: (esDefault: boolean) => void
}

function Campos(props: PropsDeCampos) {
  const { tipo, puedeGestionar, errores, valorInvalido } = props
  const { activo, alCambiarActivo, esDefault, alCambiarDefault } = props
  return (
    <>
      <Campo
        nombre="valor"
        etiqueta={`Valor: 1 ${tipo.monedaDe} en ${tipo.monedaA}`}
        inputMode="decimal"
        autoComplete="off"
        autoFocus={puedeGestionar}
        defaultValue={String(tipo.valor).replace('.', ',')}
        error={valorInvalido ? VALOR_INVALIDO : errorDeCampo(errores, 'valor')}
        ayuda="Las cotizaciones ya guardadas conservan el valor con el que se hicieron."
      />
      <Campo
        nombre="nombre"
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={40}
        defaultValue={tipo.nombre}
        error={errorDeCampo(errores, 'nombre')}
        ayuda={`Las fórmulas lo nombran por su clave, que no cambia: ${tipo.clave}.`}
      />
      <Interruptor
        titulo="Por defecto"
        ayuda={
          tipo.esDefault
            ? `Es el que se usa entre ${tipo.monedaDe} y ${tipo.monedaA}. Para cambiarlo, marca otro por defecto.`
            : `Usarlo entre ${tipo.monedaDe} y ${tipo.monedaA} cuando no se elige otro. El que lo era deja de serlo.`
        }
        valor={esDefault}
        alCambiar={alCambiarDefault}
        deshabilitado={!puedeGestionar || tipo.esDefault || !activo}
      />
      <Interruptor
        titulo="Activo"
        ayuda={
          esDefault
            ? 'El tipo de cambio por defecto no se desactiva.'
            : 'Inactivo no se ofrece al cotizar ni aparece en la barra superior.'
        }
        valor={activo}
        alCambiar={alCambiarActivo}
        deshabilitado={!puedeGestionar || esDefault}
      />
    </>
  )
}

function Formulario({ tipo, puedeGestionar, ediciones, idFormulario }: PropsDelFormulario) {
  const formulario = useRef<HTMLFormElement>(null)
  const [activo, setActivo] = useState(tipo.activo)
  const [esDefault, setEsDefault] = useState(tipo.esDefault)
  const [valorInvalido, setValorInvalido] = useState(false)
  const errores = ediciones.errores.guardar

  async function guardar(elemento: HTMLFormElement) {
    const { nombre, valor: tipeado } = valoresDe(elemento, ['nombre', 'valor'])
    const valor = valorTipeado(tipeado)
    setValorInvalido(valor === null)
    if (valor === null) {
      enfocarPrimerError(elemento)
      return
    }
    // Sólo viaja lo que cambió: lo demás no se toca.
    const hecho = await ediciones.guardar(
      {
        id: tipo.id,
        actualizadoEnEsperado: tipo.actualizadoEn,
        nombre: nombre.trim() === tipo.nombre ? undefined : nombre,
        valor: valor === tipo.valor ? undefined : valor,
        activo: activo === tipo.activo ? undefined : activo,
        esDefault: esDefault && !tipo.esDefault ? true : undefined,
      },
      nombre.trim() || tipo.nombre,
    )
    if (!hecho.ok) {
      enfocarPrimerError(elemento)
    }
  }

  return (
    <form
      id={idFormulario}
      ref={formulario}
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault()
        void guardar(evento.currentTarget)
      }}
    >
      <fieldset disabled={!puedeGestionar} className="grid min-w-0 gap-4">
        <legend className="sr-only">Tipo de cambio {tipo.nombre}</legend>
        {puedeGestionar ? null : <Aviso>{MOTIVO_SIN_PERMISO_TIPOS_CAMBIO}</Aviso>}
        <Campos
          tipo={tipo}
          puedeGestionar={puedeGestionar}
          errores={errores}
          valorInvalido={valorInvalido}
          activo={activo}
          alCambiarActivo={setActivo}
          esDefault={esDefault}
          alCambiarDefault={setEsDefault}
        />
      </fieldset>
    </form>
  )
}

// El panel de un tipo de cambio: cambiar su valor (lo de todos los días) y ver cómo fue cambiando.
export function PanelTipoCambio({ tipo, historial, puedeGestionar, ediciones, alCerrar }: Props) {
  const aLaVista = useUltimo(tipo)
  const idFormulario = useId()

  return (
    <Drawer
      abierto={tipo !== null}
      alCerrar={alCerrar}
      titulo={aLaVista?.nombre ?? 'Tipo de cambio'}
      descripcion="El valor vigente y su historial."
      pie={
        puedeGestionar ? (
          <>
            <Button variant="outline" onClick={alCerrar} disabled={ediciones.enCurso}>
              Cerrar
            </Button>
            <Button type="submit" form={idFormulario} disabled={ediciones.enCurso}>
              {ediciones.enCurso ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        ) : undefined
      }
    >
      {aLaVista ? (
        <div className="grid gap-6">
          <Formulario
            // Otro tipo de cambio, u otra versión del mismo: el formulario arranca de lo guardado.
            key={`${aLaVista.id}-${aLaVista.actualizadoEn}`}
            tipo={aLaVista}
            puedeGestionar={puedeGestionar}
            ediciones={ediciones}
            idFormulario={idFormulario}
          />
          <Historial cambios={historial} moneda={aLaVista.monedaA} />
        </div>
      ) : null}
    </Drawer>
  )
}
