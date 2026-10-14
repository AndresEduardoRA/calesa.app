'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import { formatearFecha } from '@/shared/lib/fechas'
import { resumenDeUso } from '../../../entities/uso-apibara'
import { useUsoDeApibara } from '../hooks/use-uso-de-apibara'

// «Ver uso»: cuántas consultas lleva la cuenta en el período. Se pide a mano porque cada pedido a
// apibara cuenta; así se sabe cuánta cuota queda antes de dar de alta varias líneas.
export function UsoDeApibara() {
  const { estado, pedir } = useUsoDeApibara()
  const { zonaHoraria } = useRegional()
  return (
    <div className="grid gap-2">
      <div>
        <Button
          type="button"
          variant="outline"
          className="h-11 md:h-9"
          disabled={estado.tipo === 'pidiendo'}
          onClick={() => void pedir()}
        >
          {estado.tipo === 'pidiendo' ? 'Consultando…' : 'Ver uso'}
        </Button>
      </div>
      {estado.tipo === 'visto' ? (
        <Aviso tono={estado.uso.restantes === 0 ? 'aviso' : 'info'}>
          {resumenDeUso(
            estado.uso,
            estado.uso.hasta ? formatearFecha(estado.uso.hasta, { zona: zonaHoraria }) : null,
          )}
        </Aviso>
      ) : null}
      {estado.tipo === 'fallo' ? <Aviso tono="peligro">{estado.mensaje}</Aviso> : null}
    </div>
  )
}
