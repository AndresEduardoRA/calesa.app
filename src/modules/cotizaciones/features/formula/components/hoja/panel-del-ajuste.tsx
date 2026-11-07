'use client'

import { Drawer } from '@/shared/ui/drawer'
import { nodosDelAjuste } from '../../../../entities/formula/ajuste'
import type { PropsDelAjuste } from '../../../hoja/components/huecos'
import { CuerpoDelAjuste } from './cuerpo-del-ajuste'

type Props = PropsDelAjuste & { origenId: string }

// El panel del ⚙ de una celda (4.20-3b, `?ajuste=celda&nodo=`): «Valor por defecto de <celda>» o, de un tipo de cambio, «Tipo de cambio de <celda>» (P3 del 4.20-3d). La hoja lo monta mientras la URL nombra la celda (`LugarDelAjuste`), así que
// nace abierto y se desmonta al cerrar. El cuerpo lleva `key` por nodo: otra celda es otro formulario y otra lectura.
export function PanelDelAjuste({ celda, cerrar, hoja, origenId }: Props) {
  const deTipoDeCambio = nodosDelAjuste(celda).some((n) => n.tipo === 'tipo_cambio')
  const titulo = `${deTipoDeCambio ? 'Tipo de cambio' : 'Valor por defecto'} de ${celda.etiqueta}`
  return (
    <Drawer abierto alCerrar={cerrar} titulo={titulo}>
      <CuerpoDelAjuste
        key={celda.nodo}
        celda={celda}
        cerrar={cerrar}
        hoja={hoja}
        origenId={origenId}
      />
    </Drawer>
  )
}
