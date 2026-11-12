'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/ui/button'
import { EstadoError } from '@/shared/ui/estados/estado-error'
import {
  pedidoDelFormulario,
  type CampoDelFormulario,
  type Formulario,
} from '../../../entities/descarga'
import type { Entidad } from '../../../entities/exportacion'
import type { Tarjeta, TarjetaConOrigenes } from '../../../entities/tarjetas'
import { useDescarga } from '../hooks/use-descarga'
import { AvisoDeDescarga } from './aviso-de-descarga'
import { CamposDeLaTarjeta } from './campos-de-la-tarjeta'

type Props = { entidad: Entidad; titulo: string; tarjeta: Tarjeta | TarjetaConOrigenes }

const enfocar = (id: string) => document.getElementById(id)?.focus()

// Una tarjeta de «Todo»: el rango de fechas (vacío, sin límite), el origen donde aplica y «Descargar». El rango no es un filtro de una
// lista: vive en el formulario y recargar lo limpia. Antes de pedir se valida con el mismo esquema del route, sin gastar cupo.
export function TarjetaDeEntidad({ entidad, titulo, tarjeta }: Props) {
  const router = useRouter()
  const { estado, descargar, reintentar } = useDescarga()
  const origenes = 'origenes' in tarjeta ? tarjeta.origenes : []
  const [formulario, setFormulario] = useState<Formulario>({
    entidad,
    desde: '',
    hasta: '',
    origen: entidad === 'vehiculos' ? (origenes[0]?.id ?? '') : '',
  })
  const [errores, setErrores] = useState<Partial<Record<CampoDelFormulario, string>>>({})

  // Con más filas que el tope, el foco va al rango para acortarlo.
  useEffect(() => {
    if (estado.tipo === 'demasiadas') {
      enfocar(`${entidad}-desde`)
    }
  }, [estado.tipo, entidad])

  function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    const leido = pedidoDelFormulario(formulario)
    if (!leido.ok) {
      setErrores({ [leido.campo]: leido.mensaje })
      enfocar(`${entidad}-${leido.campo}`)
      return
    }
    setErrores({})
    void descargar(leido.pedido)
  }

  const preparando = estado.tipo === 'preparando'
  return (
    <section
      aria-labelledby={`${entidad}-titulo`}
      className="grid h-full min-w-0 content-start gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4"
    >
      <h3
        id={`${entidad}-titulo`}
        className="text-(length:--text-base) font-medium text-(--color-ink)"
      >
        {titulo}
      </h3>
      {'error' in tarjeta ? (
        <EstadoError
          compacto
          titulo="No pudimos leer los orígenes."
          alReintentar={() => router.refresh()}
        />
      ) : (
        <form noValidate onSubmit={alEnviar} className="grid grid-cols-[minmax(0,1fr)] gap-3">
          <CamposDeLaTarjeta
            formulario={formulario}
            alCambiar={(campo, valor) => setFormulario((antes) => ({ ...antes, [campo]: valor }))}
            origenes={origenes}
            errores={errores}
            apagados={!tarjeta.habilitada || preparando}
          />
          <Button
            type="submit"
            className="justify-self-start"
            disabled={!tarjeta.habilitada || preparando || estado.tipo === 'sin_permiso'}
          >
            {preparando ? 'Preparando el archivo…' : 'Descargar'}
          </Button>
          {'motivo' in tarjeta ? (
            <p className="text-(length:--text-sm) text-(--color-ink-faint)">{tarjeta.motivo}</p>
          ) : (
            <AvisoDeDescarga estado={estado} alReintentar={reintentar} />
          )}
        </form>
      )}
    </section>
  )
}
