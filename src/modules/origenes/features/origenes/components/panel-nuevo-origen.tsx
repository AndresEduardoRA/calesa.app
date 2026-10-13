'use client'

import { useId, useState } from 'react'
import { enfocarPrimerError, errorDeCampo } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { Opciones } from '@/shared/ui/opciones'
import { resumenDePreconfiguracion } from '../../../entities/preconfiguraciones'
import {
  ETIQUETA_DE_TIPO_DE_ORIGEN,
  TIPOS_DE_ORIGEN,
  type TipoDeOrigen,
} from '../../../entities/origen'
import { COLOR_INICIAL, useValoresDeOrigen } from '../hooks/use-valores-de-origen'
import type { EdicionesDeOrigenes } from '../hooks/use-origenes'
import { CamposDeOrigen } from './campos-de-origen'

type Props = {
  abierto: boolean
  ediciones: EdicionesDeOrigenes
  alCerrar: () => void
  // Con el origen ya creado: la lista lleva a su pantalla para que siga con los pasos.
  alCrear: (id: string) => void
}

type PropsDelFormulario = Omit<Props, 'abierto'> & { idFormulario: string }

function Formulario({ ediciones, alCrear, idFormulario }: PropsDelFormulario) {
  const [tipo, setTipo] = useState<TipoDeOrigen>('manual')
  const [errorDeNombre, setErrorDeNombre] = useState<string | undefined>(undefined)
  const { valores, cambiar } = useValoresDeOrigen(
    { nombre: '', sustantivo: 'vehículo', genero: 'm', color: COLOR_INICIAL, plataformas: [] },
    false,
  )
  const errores = ediciones.errores.crear

  async function crear(elemento: HTMLFormElement) {
    setErrorDeNombre(undefined)
    const resultado = await ediciones.crear({
      ...valores,
      tipo,
      plataformas: tipo === 'subasta' ? valores.plataformas : [],
    })
    if (resultado.ok) {
      alCrear(resultado.data.id)
      return
    }
    if (resultado.error.codigo === 'duplicado') {
      setErrorDeNombre(resultado.error.mensaje)
    }
    enfocarPrimerError(elemento)
  }

  return (
    <form
      id={idFormulario}
      noValidate
      className="grid gap-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        void crear(evento.currentTarget)
      }}
    >
      <Opciones<TipoDeOrigen>
        etiqueta="Tipo"
        opciones={TIPOS_DE_ORIGEN.map((valor) => ({
          valor,
          etiqueta: ETIQUETA_DE_TIPO_DE_ORIGEN[valor],
        }))}
        valor={tipo}
        alCambiar={setTipo}
        ayuda="No cambia después de crearlo."
      />
      <Aviso>{resumenDePreconfiguracion(tipo)}</Aviso>
      <CamposDeOrigen
        valores={valores}
        alCambiar={(parcial) => {
          if (parcial.nombre !== undefined) {
            setErrorDeNombre(undefined)
          }
          cambiar(parcial)
        }}
        esDeSubasta={tipo === 'subasta'}
        errores={{
          nombre: errorDeNombre ?? errorDeCampo(errores, 'nombre'),
          sustantivo: errorDeCampo(errores, 'sustantivo'),
          color: errorDeCampo(errores, 'color'),
          plataformas: errorDeCampo(errores, 'plataformas'),
        }}
      />
    </form>
  )
}

// Crear un origen: el tipo decide con qué campos nace. El flujo y los campos los crea la base en
// la misma operación; acá sólo se piden los datos propios del origen.
export function PanelNuevoOrigen({ abierto, ediciones, alCerrar, alCrear }: Props) {
  const idFormulario = useId()
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Nuevo origen"
      descripcion="De dónde vienen los vehículos: una subasta, una oficina, un país."
      pie={
        <>
          <Button variant="outline" onClick={alCerrar} disabled={ediciones.enCurso}>
            Cancelar
          </Button>
          <Button type="submit" form={idFormulario} disabled={ediciones.enCurso}>
            {ediciones.enCurso ? 'Creando…' : 'Crear origen'}
          </Button>
        </>
      }
    >
      <Formulario
        ediciones={ediciones}
        alCerrar={alCerrar}
        alCrear={alCrear}
        idFormulario={idFormulario}
      />
    </Drawer>
  )
}
