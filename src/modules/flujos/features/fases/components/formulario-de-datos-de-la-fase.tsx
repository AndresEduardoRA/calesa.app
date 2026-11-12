'use client'

import { useId } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import type { BloqueDeFase } from '../../../entities/fases/bloques-de-fase'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import { useFormularioDeDatos } from '../hooks/use-formulario-de-datos'
import { BloqueDemora } from './bloque-demora'
import { BloqueEnElFlujo } from './bloque-en-el-flujo'
import { BloqueIdentidad } from './bloque-identidad'
import { BloqueTransporte } from './bloque-transporte'
import { BloqueWebYPortal } from './bloque-web-y-portal'

type Props = { flujo: FlujoParaConfigurar; fase: FaseParaConfigurar }

// El formulario de «Datos» de una fase: cinco bloques plegables (Identidad abierto), «Guardar» y «Cancelar» al pie del panel. Un envío a la vez; mientras
// guarda, los campos van apagados (cada control, a mano: un `<fieldset disabled>` no apaga los `Switch`). Lo escrito sin guardar queda en su borrador y,
// si la persona se va por un aviso que sale de la pantalla, el panel pregunta.
export function FormularioDeDatosDeLaFase({ flujo, fase }: Props) {
  const idDelFormulario = useId()
  const f = useFormularioDeDatos({ flujo, fase })
  useCambiosSinGuardar(f.hayCambios, f.descartar)
  const contexto = { ambito: flujo.ambito, reglas: flujo.reglas }
  const delBloque = (bloque: BloqueDeFase) => f.conError.has(bloque)
  const comunes = {
    valores: f.valores,
    errores: f.errores,
    escribir: f.escribir,
    deshabilitado: f.enCurso,
    contexto,
  }

  return (
    <form
      id={idDelFormulario}
      noValidate
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        void f.enviar()
      }}
    >
      {f.esperandoConexion ? (
        <Aviso tono="aviso">
          {f.enLinea
            ? 'No pudimos guardar. Lo escrito sigue aquí.'
            : 'Sin conexión: se guarda solo cuando vuelva.'}
        </Aviso>
      ) : null}
      <BloqueIdentidad {...comunes} conError={delBloque('identidad')} />
      <BloqueEnElFlujo
        {...comunes}
        conError={delBloque('en-el-flujo')}
        fase={fase}
        fases={flujo.fases}
      />
      <BloqueDemora {...comunes} conError={delBloque('demora')} />
      <BloqueTransporte {...comunes} conError={delBloque('transporte')} />
      <BloqueWebYPortal {...comunes} conError={delBloque('web-y-portal')} />
      <PieDelPanel
        idFormulario={idDelFormulario}
        enCurso={f.enCurso}
        alCancelar={f.descartar}
        etiquetaDeGuardar="Guardar"
      />
    </form>
  )
}
