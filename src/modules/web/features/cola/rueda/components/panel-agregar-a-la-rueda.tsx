'use client'

import { useId, useRef, useState } from 'react'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { CambiosSinGuardar } from '@/shared/ui/cambios-sin-guardar'
import { Drawer } from '@/shared/ui/drawer'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { configuracionNueva, type PersonaParaLaRueda } from '../../../../entities/cola/rueda'
import { useAgregarALaRueda } from '../hooks/use-agregar-a-la-rueda'
import { CamposDeLaRueda, type ValoresDeLaRueda } from './campos-de-la-rueda'
import { PersonasParaElegir } from './personas-para-elegir'

export type PropsDelPanelAgregarALaRueda = {
  abierto: boolean
  alCerrar: () => void
  busqueda: string
  buscando: boolean
  alBuscar: (texto: string) => void
  personas: readonly PersonaParaLaRueda[] | null
  hayMas: boolean
  errorDelEquipo: string | null
  // El tablero no trajo a todas las habilitadas: los valores de alguien de afuera no se conocen.
  hayMasEnElTablero: boolean
  puedeVerRoles: boolean
}

function numeroDe(texto: string): number {
  return texto.trim() === '' ? Number.NaN : Number(texto)
}

// Lo escrito, como lo espera la action: un cupo vacío hereda la política; un número que no es tal no pasa el esquema y vuelve a su campo.
function configuracionDe(usuarioId: string, valores: ValoresDeLaRueda) {
  return {
    usuarioId,
    maxAbiertas: valores.maxAbiertas.trim() === '' ? null : numeroDe(valores.maxAbiertas),
    prioridad: numeroDe(valores.prioridad),
    orden: numeroDe(valores.orden),
  }
}

// «Agregar a la rueda»: un Drawer con su URL. Se elige a alguien del equipo y se fija su cupo (vacío hereda el de la política), prioridad y orden. Si ya
// estaba habilitada, trae sus valores y el botón dice «Guardar». Quien lo monta le da una `key` por apertura: cada una empieza de cero.
export function PanelAgregarALaRueda(props: PropsDelPanelAgregarALaRueda) {
  const idDelFormulario = useId()
  const formulario = useRef<HTMLFormElement>(null)
  const [elegida, setElegida] = useState<PersonaParaLaRueda | null>(null)
  const [valores, setValores] = useState<ValoresDeLaRueda>({
    maxAbiertas: '',
    prioridad: '0',
    orden: '0',
  })
  const g = useAgregarALaRueda({ puedeVerRoles: props.puedeVerRoles, alGuardar: props.alCerrar })

  function elegir(persona: PersonaParaLaRueda) {
    const c = persona.enLaRueda ?? configuracionNueva(persona.id)
    setElegida(persona)
    setValores({
      maxAbiertas: c.maxAbiertas === null ? '' : String(c.maxAbiertas),
      prioridad: String(c.prioridad),
      orden: String(c.orden),
    })
  }

  return (
    <Drawer
      abierto={props.abierto}
      alCerrar={props.alCerrar}
      titulo="Agregar a la rueda"
      pie={
        <PieDelPanel
          idFormulario={idDelFormulario}
          enCurso={g.enCurso}
          alCancelar={props.alCerrar}
          etiquetaDeGuardar={elegida?.enLaRueda ? 'Guardar' : 'Agregar a la rueda'}
          sinPuedeEnviar={elegida === null}
        />
      }
    >
      <CambiosSinGuardar hayCambios={elegida !== null} />
      <form
        ref={formulario}
        id={idDelFormulario}
        className="grid gap-4"
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault()
          if (elegida) {
            void g.guardar(configuracionDe(elegida.id, valores), elegida.nombre, formulario.current)
          }
        }}
      >
        {elegida === null ? (
          <PersonasParaElegir {...props} alElegir={elegir} />
        ) : (
          <>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <span className="font-medium break-words text-(--color-ink)">{elegida.nombre}</span>
              <Button
                type="button"
                variant="ghost"
                className="h-11 md:h-8"
                onClick={() => {
                  setElegida(null)
                }}
              >
                Cambiar
              </Button>
            </div>
            {props.hayMasEnElTablero && !elegida.enLaRueda ? (
              <AvisoDeTope texto="Puede haber habilitadas que no se leyeron: si ya estaba en la rueda, revisa sus valores antes de guardar." />
            ) : null}
            <CamposDeLaRueda valores={valores} errores={g.errores} alCambiar={setValores} />
          </>
        )}
      </form>
    </Drawer>
  )
}
