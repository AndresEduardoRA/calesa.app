'use client'

import { useId, useState } from 'react'
import { enfocarPrimerError, valoresDe } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { MOTIVO_SIN_PERMISO_TIPOS_CAMBIO } from '../../../entities/motivos'
import type { Moneda } from '../../../entities/tipos-cambio'
import type { EdicionesDeTiposCambio } from '../hooks/use-tipos-cambio'
import { CamposMoneda } from './campos-moneda'

type Props = {
  // 'nueva' para crear, la moneda de `?moneda=` para editar, null con el panel cerrado.
  moneda: Moneda | 'nueva' | null
  monedaBase: string
  puedeGestionar: boolean
  ediciones: EdicionesDeTiposCambio
  alCerrar: () => void
}

type PropsDelFormulario = Omit<Props, 'moneda'> & { moneda: Moneda | null; idFormulario: string }

function Formulario(props: PropsDelFormulario) {
  const { moneda, monedaBase, puedeGestionar, ediciones, idFormulario, alCerrar } = props
  const [activa, setActiva] = useState(moneda?.activa ?? true)

  async function guardar(elemento: HTMLFormElement) {
    const campos = valoresDe(elemento, ['codigo', 'nombre', 'simbolo', 'decimales'])
    const datos = {
      nombre: campos.nombre,
      simbolo: campos.simbolo,
      decimales: campos.decimales === '' ? Number.NaN : Number(campos.decimales),
    }
    const hecho = moneda
      ? await ediciones.guardarMoneda({
          codigo: moneda.codigo,
          actualizadoEnEsperado: moneda.actualizadoEn,
          ...datos,
          activa: activa === moneda.activa ? undefined : activa,
        })
      : await ediciones.crearMoneda({ codigo: campos.codigo, ...datos })
    if (hecho.ok) {
      alCerrar()
    } else {
      enfocarPrimerError(elemento)
    }
  }

  return (
    <form
      id={idFormulario}
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault()
        void guardar(evento.currentTarget)
      }}
    >
      <fieldset disabled={!puedeGestionar} className="grid min-w-0 gap-4">
        <legend className="sr-only">{moneda ? `Moneda ${moneda.codigo}` : 'Moneda nueva'}</legend>
        {puedeGestionar ? null : <Aviso>{MOTIVO_SIN_PERMISO_TIPOS_CAMBIO}</Aviso>}
        <CamposMoneda
          moneda={moneda}
          esBase={moneda?.codigo === monedaBase}
          errores={moneda ? ediciones.errores.guardarMoneda : ediciones.errores.crearMoneda}
          activa={activa}
          alCambiarActiva={setActiva}
          deshabilitado={!puedeGestionar}
        />
      </fieldset>
    </form>
  )
}

// Crear una moneda o editar una que ya existe. No se borran: se desactivan.
export function PanelMoneda({ moneda, monedaBase, puedeGestionar, ediciones, alCerrar }: Props) {
  const aLaVista = useUltimo(moneda)
  const idFormulario = useId()
  const existente = aLaVista === 'nueva' ? null : aLaVista

  return (
    <Drawer
      abierto={moneda !== null}
      alCerrar={alCerrar}
      titulo={existente ? `${existente.codigo} · ${existente.nombre}` : 'Nueva moneda'}
      pie={
        puedeGestionar ? (
          <>
            <Button variant="outline" onClick={alCerrar} disabled={ediciones.enCurso}>
              Cancelar
            </Button>
            <Button type="submit" form={idFormulario} disabled={ediciones.enCurso}>
              {ediciones.enCurso ? 'Guardando…' : existente ? 'Guardar' : 'Crear moneda'}
            </Button>
          </>
        ) : undefined
      }
    >
      {aLaVista ? (
        <Formulario
          key={existente ? `${existente.codigo}-${existente.actualizadoEn}` : 'nueva'}
          moneda={existente}
          monedaBase={monedaBase}
          puedeGestionar={puedeGestionar}
          ediciones={ediciones}
          idFormulario={idFormulario}
          alCerrar={alCerrar}
        />
      ) : null}
    </Drawer>
  )
}
