'use client'

import { Campo } from '@/shared/ui/campo'
import { LARGO_MAXIMO_DE_TITULO } from '../../../entities/edicion'
import { TOPE_DE_DESTINATARIOS } from '../../../entities/visibilidad'
import { leerPersonasParaEvento } from '../../../composicion.client'
import { SelectorDePersonas } from '../../personas/components/selector-de-personas'
import type { useFormularioDeEvento } from '../hooks/use-formulario-de-evento'
import { BloquesDeEvento } from './bloques-de-evento'
import { CampoDeVisibilidad } from './campo-de-visibilidad'

type Props = {
  formulario: ReturnType<typeof useFormularioDeEvento>
  puedePublicar: boolean
}

// Los campos de un evento: lo principal a la vista (título, cuándo, quién lo ve) y, plegados salvo que traigan algo, el lugar y la descripción.
export function CamposDeEvento({ formulario: f, puedePublicar }: Props) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <Campo
        nombre="titulo"
        etiqueta="Título"
        value={f.valores.titulo}
        maxLength={LARGO_MAXIMO_DE_TITULO + 20}
        error={f.errores.titulo}
        onChange={(evento) => {
          f.cambiar('titulo', evento.target.value)
        }}
      />
      <Campo
        nombre="inicia_en"
        etiqueta="Empieza"
        type="datetime-local"
        value={f.valores.iniciaEn}
        error={f.errores.inicia_en}
        onChange={(evento) => {
          f.cambiar('iniciaEn', evento.target.value)
        }}
      />
      <Campo
        nombre="termina_en"
        etiqueta="Termina (opcional)"
        type="datetime-local"
        value={f.valores.terminaEn}
        error={f.errores.termina_en}
        onChange={(evento) => {
          f.cambiar('terminaEn', evento.target.value)
        }}
      />
      <CampoDeVisibilidad
        valor={f.valores.visibilidad}
        puedePublicar={puedePublicar}
        error={f.errores.visibilidad}
        alCambiar={(valor) => {
          f.cambiar('visibilidad', valor)
          if (valor !== 'seleccionados') {
            f.cambiar('destinatarios', [])
          }
        }}
      />
      {f.valores.visibilidad === 'seleccionados' ? (
        <SelectorDePersonas
          etiqueta="¿Con quién?"
          multiple
          maximo={TOPE_DE_DESTINATARIOS}
          elegidas={f.valores.destinatarios}
          alCambiar={(personas) => {
            f.cambiar('destinatarios', personas)
          }}
          leer={leerPersonasParaEvento}
          error={f.errores.destinatarios}
        />
      ) : null}
      <BloquesDeEvento formulario={f} />
    </div>
  )
}
