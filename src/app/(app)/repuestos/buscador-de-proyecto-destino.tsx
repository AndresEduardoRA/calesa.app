'use client'

import {
  buscarProyectoAbierto,
  interpretarBusquedaDeProyecto,
} from '@/modules/repuestos/pantallas/proyectos'
import { BuscadorConLista } from './buscador-con-lista'
import type { PropsDelBuscador } from './tipos-del-buscador'

// El campo «Proyecto destino» de reasignar el stock (8.10-3, C6): los proyectos abiertos que quien mira ve, sin el de origen. Lo compone `src/app`: el área `stock` no
// importa `proyectos`.
export function BuscadorDeProyectoDestino({
  excluir,
  ...props
}: PropsDelBuscador & { excluir: string }) {
  return (
    <BuscadorConLista
      {...props}
      nombre="proyectoDestinoId"
      marcador="Número, vehículo o cliente"
      buscar={(texto, signal) => buscarProyectoAbierto(texto, signal, excluir)}
      interpretar={interpretarBusquedaDeProyecto}
      avisoDelMinimo="Escribe al menos 3 letras o el número del proyecto."
    />
  )
}
