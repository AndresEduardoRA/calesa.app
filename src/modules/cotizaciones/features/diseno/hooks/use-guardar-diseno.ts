'use client'

import { useMemo, useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import { esquemaDiseno, type Diseno } from '../../../entities/diseno'
import {
  hayCambiosEnElDiseno,
  pedidoDeGuardarDiseno,
  type BaseDelDiseno,
  type BorradorDelDisenoGuardado,
  type DisenoParaEditar,
} from '../../../entities/diseno/edicion-del-diseno'
import { guardarDiseno } from '../actions/guardar-diseno'
import {
  MENSAJE_DE_VALIDACION,
  motivoParaNoGuardarElDiseno,
  type EstadoDelGuardadoDelDiseno,
} from './use-guardar-diseno.soporte'

type EnvioALaVez = {
  mandar: <T>(envio: () => Promise<T>) => Promise<T | null>
  enCurso: boolean
}

function estadoDelError(
  envio: Exclude<Envio<BorradorDelDisenoGuardado>, { ok: true }>,
): EstadoDelGuardadoDelDiseno {
  if ('sinRed' in envio) return { tipo: 'sin_respuesta' }
  const { codigo, mensaje } = envio.error
  // Sólo el PT409 trae el texto de la base (nombra a una persona y cuándo); lo demás, su texto propio.
  if (codigo === 'conflicto') return { tipo: 'conflicto', mensaje }
  if (codigo === 'regla') return { tipo: 'regla' }
  if (codigo === 'sin_permiso') return { tipo: 'sin_permiso' }
  return { tipo: 'error' }
}

type Valores = { diseno: unknown }

const baseDe = ({ id, estado, actualizadoEn, nota }: DisenoParaEditar): BaseDelDiseno => ({
  id,
  estado,
  actualizadoEn,
  nota,
})

type Args = {
  origenId: string
  leida: DisenoParaEditar
  // El diseño de este editor (nunca nulo: sin diseño no se abre).
  disenoLeido: Diseno
  trabajo: Diseno
  envio: EnvioALaVez
  // El diseño de trabajo pasa a otro: el que trae el borrador local o, tras guardar, el guardado.
  alReemplazar: (diseno: Diseno) => void
}

// «Guardar el borrador» del diseño (4.22-2): la base sobre la que guarda (la versión leída y, tras guardar, la fila que devolvió la base, sin releer: releer dejaría
// entrar a otra persona entremedio), lo guardado contra lo que se mide si hay cambios, y lo cambiado en la pestaña con `useBorradorDeEstado`, por origen, id y hora
// de la base (otra versión no lo repone; tras guardar se limpia).
export function useGuardadoDelDiseno({
  origenId,
  leida,
  disenoLeido,
  trabajo,
  envio,
  alReemplazar,
}: Args) {
  const [base, setBase] = useState<BaseDelDiseno>(() => baseDe(leida))
  const [guardado, setGuardado] = useState<Diseno>(disenoLeido)
  const [estado, setEstado] = useState<EstadoDelGuardadoDelDiseno>({ tipo: 'quieto' })

  const valores = useMemo<Valores>(() => ({ diseno: trabajo }), [trabajo])
  const enLaBase = useMemo<Valores>(() => ({ diseno: guardado }), [guardado])
  const { limpiar } = useBorradorDeEstado<Valores>({
    clave: `diseno-editor:${origenId}:${base.id}:${base.actualizadoEn}`,
    valores,
    guardado: enLaBase,
    alReponer: (cambios) => {
      const repuesto = esquemaDiseno.safeParse(cambios.diseno)
      if (repuesto.success) alReemplazar(repuesto.data)
    },
  })

  const hayCambios = useMemo(() => hayCambiosEnElDiseno(guardado, trabajo), [guardado, trabajo])

  async function guardar() {
    const pedido = pedidoDeGuardarDiseno(base, leida, trabajo, origenId)
    const diseno = trabajo
    // Lo que dijo el intento anterior no queda a la vista mientras corre este.
    setEstado({ tipo: 'quieto' })
    const r = await envio.mandar(() => enviarAccion(guardarDiseno(pedido), MENSAJE_DE_VALIDACION))
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
    setGuardado(diseno)
    setEstado({ tipo: 'entro' })
  }

  return {
    enCurso: envio.enCurso,
    estado,
    motivo: motivoParaNoGuardarElDiseno(hayCambios),
    guardar,
  }
}
