'use client'

import { useId, useState } from 'react'
import { enfocarPrimerError, errorDeCampo, valoresDe } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { Drawer } from '@/shared/ui/drawer'
import { valorTipeado, type Moneda } from '../../../entities/tipos-cambio'
import type { EdicionesDeTiposCambio } from '../hooks/use-tipos-cambio'

type Props = {
  abierto: boolean
  // Las monedas activas.
  monedas: readonly Moneda[]
  monedaBase: string
  ediciones: EdicionesDeTiposCambio
  alCerrar: () => void
}

const VALOR_INVALIDO = 'Escribe un valor mayor que cero, con hasta 6 decimales.'

type PropsDeCampos = {
  opciones: readonly { valor: string; etiqueta: string }[]
  monedaBase: string
  // La moneda que se propone del otro lado.
  otra: string
  errores: EdicionesDeTiposCambio['errores']['crear']
  valorInvalido: boolean
}

function Campos({ opciones, monedaBase, otra, errores, valorInvalido }: PropsDeCampos) {
  return (
    <>
      <Campo
        nombre="nombre"
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={40}
        error={errorDeCampo(errores, 'nombre')}
        ayuda="De él sale la clave con la que lo nombran las fórmulas. La clave no cambia después."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSeleccion
          nombre="monedaDe"
          etiqueta="Una unidad de"
          opciones={opciones}
          defaultValue={monedaBase}
          error={errorDeCampo(errores, 'monedaDe')}
        />
        <CampoSeleccion
          nombre="monedaA"
          etiqueta="Vale, en"
          opciones={opciones}
          defaultValue={otra}
          error={errorDeCampo(errores, 'monedaA')}
        />
      </div>
      <Campo
        nombre="valor"
        etiqueta="Valor"
        inputMode="decimal"
        autoComplete="off"
        error={valorInvalido ? VALOR_INVALIDO : errorDeCampo(errores, 'valor')}
      />
    </>
  )
}

export function PanelNuevoTipoCambio({ abierto, monedas, monedaBase, ediciones, alCerrar }: Props) {
  const idFormulario = useId()
  const [valorInvalido, setValorInvalido] = useState(false)
  const errores = ediciones.errores.crear
  const opciones = monedas.map((moneda) => ({
    valor: moneda.codigo,
    etiqueta: `${moneda.codigo} · ${moneda.nombre}`,
  }))
  const otra = monedas.find((moneda) => moneda.codigo !== monedaBase)?.codigo

  async function crear(elemento: HTMLFormElement) {
    const campos = valoresDe(elemento, ['nombre', 'monedaDe', 'monedaA', 'valor'])
    const valor = valorTipeado(campos.valor)
    setValorInvalido(valor === null)
    if (valor === null) {
      enfocarPrimerError(elemento)
      return
    }
    const hecho = await ediciones.crear({ ...campos, valor })
    if (hecho.ok) {
      alCerrar()
    } else {
      enfocarPrimerError(elemento)
    }
  }

  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Nuevo tipo de cambio"
      descripcion="Un valor con nombre entre dos monedas: oficial, paralelo, el del banco."
      pie={
        <>
          <Button variant="outline" onClick={alCerrar} disabled={ediciones.enCurso}>
            Cancelar
          </Button>
          <Button type="submit" form={idFormulario} disabled={ediciones.enCurso || !otra}>
            {ediciones.enCurso ? 'Creando…' : 'Crear tipo de cambio'}
          </Button>
        </>
      }
    >
      {otra ? (
        <form
          id={idFormulario}
          noValidate
          className="grid gap-4"
          onSubmit={(evento) => {
            evento.preventDefault()
            void crear(evento.currentTarget)
          }}
        >
          <Campos
            opciones={opciones}
            monedaBase={monedaBase}
            otra={otra}
            errores={errores}
            valorInvalido={valorInvalido}
          />
        </form>
      ) : (
        <Aviso>
          Hacen falta dos monedas activas para crear un tipo de cambio. Agrega la que falta en
          «Monedas».
        </Aviso>
      )}
    </Drawer>
  )
}
