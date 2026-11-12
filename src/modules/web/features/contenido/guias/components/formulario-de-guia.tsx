'use client'

import { useId } from 'react'
import { useAtajo } from '@/shared/ui/atajos'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import { useRegional } from '@/shared/ui/regional'
import { formatearFecha } from '@/shared/lib/fechas'
import { htmlDelDocumento } from '../../../../entities/contenido/doc'
import {
  estadoDeGuia,
  tieneCuerpo,
  type GuiaCompleta,
  type OpcionesDeGuia,
} from '../../../../entities/contenido/guias'
import { useGuardarGuia } from '../hooks/use-guardar-guia'
import { useValoresDeGuia } from '../hooks/use-valores-de-guia'
import type { ValoresDeGuia } from '../hooks/valores-de-guia'
import { BarraDePublicacion } from './barra-de-publicacion'
import { BloqueContenido } from './bloque-contenido'
import { BloqueDatos } from './bloque-datos'
import { BloqueSeo } from './bloque-seo'
import { CabeceraDeLaGuia } from './cabecera-de-la-guia'
import { ConfirmarEliminarGuia } from './confirmar-eliminar-guia'

export type PropsDeLaGuia = {
  guia: GuiaCompleta
  opciones: OpcionesDeGuia
  // El instante de la lectura (ISO): de él sale el estado de la guía.
  ahora: string
  // Tiene `web.guias.publicar` (lo decide la página con `puede()`); la base lo repite.
  puedePublicarGuias: boolean
}

function motivoDelDocumento(cuerpo: ValoresDeGuia['cuerpo']): string | null {
  const html = htmlDelDocumento(cuerpo)
  return html.ok ? null : html.motivo
}

// La página de una guía: contenido con el editor, datos, SEO, la barra de guardar y publicar, y eliminar. Quien la usa le pone de `key` la versión de
// la guía: lo guardado (aquí o por otra persona) la vuelve a montar desde la base. El borrador guarda lo escrito, el documento incluido.
export function FormularioDeGuia({ guia, opciones, ahora, puedePublicarGuias }: PropsDeLaGuia) {
  const idFormulario = useId()
  const enLinea = useEnLinea()
  const { zonaHoraria } = useRegional()
  const { valores, cambiar, borrador } = useValoresDeGuia(guia)
  const { guardar, recargar, enCurso, conflicto, errores } = useGuardarGuia({
    guia,
    valores,
    alGuardar: borrador.limpiar,
  })
  const estado = estadoDeGuia(guia.publicadaEn, new Date(ahora))
  const guardarAhora = () => {
    void guardar({ tipo: 'mantener' }, 'Guía guardada')
  }
  useAtajo('guardar', guardarAhora)
  useAtajo('guardarYSeguir', guardarAhora)

  return (
    <div className="grid gap-4">
      <CabeceraDeLaGuia guia={guia} ahora={ahora} zona={zonaHoraria} />
      <BarraDePublicacion
        idFormulario={idFormulario}
        estado={estado}
        puedePublicarGuias={puedePublicarGuias}
        conCuerpo={tieneCuerpo(valores.cuerpo)}
        enLinea={enLinea}
        enCurso={enCurso}
        zona={zonaHoraria}
        alPublicar={() => {
          void guardar({ tipo: 'publicar' }, 'Guía publicada')
        }}
        alProgramar={(cuando) => {
          void guardar(
            { tipo: 'programar', cuando },
            `Guía programada para el ${formatearFecha(cuando, { zona: zonaHoraria })}`,
          )
        }}
        alDespublicar={() => {
          void guardar({ tipo: 'despublicar' }, 'Guía despublicada')
        }}
      />
      {enLinea ? null : (
        <Aviso tono="aviso">
          No hay conexión. Puedes seguir escribiendo: guarda cuando vuelva.
        </Aviso>
      )}
      {conflicto ? <AvisoDeConflicto mensaje={conflicto} alRecargar={recargar} /> : null}
      <form
        id={idFormulario}
        noValidate
        className="grid gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          guardarAhora()
        }}
      >
        <fieldset disabled={enCurso} className="grid min-w-0 gap-4">
          <legend className="sr-only">Guía</legend>
          <BloqueContenido
            valores={valores}
            cambiar={cambiar}
            errores={errores}
            motivoDelCuerpo={motivoDelDocumento(valores.cuerpo)}
            deshabilitado={enCurso}
          />
          <BloqueDatos
            valores={valores}
            cambiar={cambiar}
            errores={errores}
            opciones={opciones}
            deshabilitado={enCurso}
          />
          <BloqueSeo valores={valores} cambiar={cambiar} errores={errores} />
        </fieldset>
      </form>
      <div>
        <ConfirmarEliminarGuia guia={guia} />
      </div>
    </div>
  )
}
