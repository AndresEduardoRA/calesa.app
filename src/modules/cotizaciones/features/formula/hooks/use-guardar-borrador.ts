'use client'

import { useMemo, useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import { esquemaFormula, type Formula } from '../../../entities/formula'
import type { BaseDelEditor, FormulaParaEditar } from '../../../entities/formula/edicion'
import type { BorradorGuardado } from '../../../entities/formula/repositorio'
import {
  TEXTO_SIN_DISENO,
  filasSinCelda,
  textoDeSinCelda,
} from '../../../entities/formula/sin-celda'
import { guardarBorrador } from '../actions/guardar-borrador'
import { paramsPlanos, type FilaParaDibujar } from './use-editor-de-la-formula.soporte'
import {
  formulaParaGuardar,
  hayCambiosPorGuardar,
  motivoParaNoGuardar,
  pedidoDeGuardar,
  type EstadoDelGuardado,
} from './use-guardar-borrador.soporte'

type EnvioALaVez = {
  mandar: <T>(envio: () => Promise<T>) => Promise<T | null>
  enCurso: boolean
}

const MENSAJE_DE_VALIDACION = 'No pudimos guardar: la fórmula no tiene la forma que se espera.'

function estadoDelError(envio: Exclude<Envio<BorradorGuardado>, { ok: true }>): EstadoDelGuardado {
  if ('sinRed' in envio) return { tipo: 'sin_respuesta' }
  const { codigo, mensaje } = envio.error
  if (codigo === 'conflicto') return { tipo: 'conflicto', mensaje }
  if (codigo === 'regla') return { tipo: 'regla' }
  if (codigo === 'sin_permiso') return { tipo: 'sin_permiso' }
  return { tipo: 'error', mensaje }
}

type Valores = { definicion: unknown; params: unknown }

const valoresDe = (formula: Formula): Valores => ({
  definicion: formula.definicion,
  params: paramsPlanos(formula),
})

const baseDe = ({ id, actualizadoEn, estado, diseno, nota }: FormulaParaEditar): BaseDelEditor => ({
  id,
  actualizadoEn,
  estado,
  diseno,
  nota,
})

// El aviso de lo que el diseño no muestra (C6), con las etiquetas de sus filas.
function avisoDelDisenoDe(
  guardable: Formula,
  base: BaseDelEditor,
  filas: readonly FilaParaDibujar[],
) {
  const falta = filasSinCelda(guardable.definicion, base.diseno)
  if (falta.tipo === 'sin_diseno') return TEXTO_SIN_DISENO
  const etiquetas = new Map(filas.map((f) => [f.id, f.etiqueta]))
  return textoDeSinCelda(falta.filas.map((id) => etiquetas.get(id) ?? id))
}

type Args = {
  origenId: string
  leida: FormulaParaEditar
  trabajo: Formula
  filas: readonly FilaParaDibujar[]
  // Una fila en edición o el formulario de «Sumar fila»; y el rechazo de `validarFormula()` sobre la fórmula de trabajo.
  hayAbierta: boolean
  hayRechazo: boolean
  // El envío lo comparte el editor: mientras guarda, no deja abrir, aplicar ni sumar filas.
  envio: EnvioALaVez
  // La fórmula de trabajo pasa a otra: la que trae el borrador local (lo aplicado y no guardado) o, tras guardar, la guardada (con los textos reescritos).
  alReemplazar: (formula: Formula) => void
}

// «Guardar el borrador» del editor (4.21-3b-1, C1 a C6): la base sobre la que guarda (la versión leída y, tras guardar, la fila que devolvió la base, sin releer:
// releer dejaría entrar a otra persona entremedio), lo guardado contra lo que se mide si hay cambios, y lo aplicado en la pestaña con `useBorradorDeEstado`, por
// versión (otra versión, otro id u otra hora, no lo repone; tras guardar se limpia la vieja). Lo que se guarda lleva el texto que reescribió el ⚙.
export function useGuardadoDelEditor(args: Args) {
  const { origenId, leida, trabajo, filas, envio } = args
  const [base, setBase] = useState<BaseDelEditor>(() => baseDe(leida))
  const [guardada, setGuardada] = useState<Formula>(leida.formula)
  const [estado, setEstado] = useState<EstadoDelGuardado>({ tipo: 'quieto' })

  const valores = useMemo(() => valoresDe(trabajo), [trabajo])
  const enLaBase = useMemo(() => valoresDe(guardada), [guardada])
  const { limpiar } = useBorradorDeEstado<Valores>({
    clave: `formula-editor:${origenId}:${base.id}:${base.actualizadoEn}`,
    valores,
    guardado: enLaBase,
    alReponer: (cambios) => {
      const repuesta = esquemaFormula.safeParse({ ...valores, ...cambios })
      if (repuesta.success) args.alReemplazar(repuesta.data)
    },
  })

  const guardable = useMemo(() => formulaParaGuardar(trabajo, filas), [trabajo, filas])
  const hayCambios = useMemo(() => hayCambiosPorGuardar(guardada, guardable), [guardada, guardable])
  const avisoDelDiseno = useMemo(
    () => avisoDelDisenoDe(guardable, base, filas),
    [guardable, base, filas],
  )

  async function guardar() {
    const pedido = pedidoDeGuardar(base, guardable, origenId)
    const formula = guardable
    const r = await envio.mandar(() => enviarAccion(guardarBorrador(pedido), MENSAJE_DE_VALIDACION))
    if (r === null) return
    if (!r.ok) {
      setEstado(estadoDelError(r))
      return
    }
    limpiar()
    setBase((b) => ({
      ...b,
      id: r.data.id,
      actualizadoEn: r.data.actualizadoEn,
      estado: 'borrador',
      nota: b.estado === 'publicada' ? null : b.nota,
    }))
    setGuardada(formula)
    args.alReemplazar(formula)
    setEstado({ tipo: 'entro' })
  }

  return {
    enCurso: envio.enCurso,
    estado,
    motivo: motivoParaNoGuardar({
      hayAbierta: args.hayAbierta,
      hayRechazo: args.hayRechazo,
      hayCambios,
    }),
    avisoDelDiseno,
    guardar,
  }
}
