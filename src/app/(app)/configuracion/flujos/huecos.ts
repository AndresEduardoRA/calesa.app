import type { HuecosDelFlujo } from '@/modules/flujos/pantallas/configuracion'
import { BloqueDeRequisitos } from '@/modules/flujos/pantallas/requisitos'

// Lo que cada área de `flujos` pone en la pantalla de flujos: la lista de acciones, el «⋯» y las salidas de cada fila, la franja de «Revisar» y los tres bloques
// del inspector (`HuecosDelFlujo`). Son componentes de cliente. Cada paso suma su línea acá al llenar su hueco: 5.04 (acciones y «Datos»), 5.06 (salidas),
// 5.08 (requisitos) y 5.12 (la franja).
export const HUECOS_DE_FLUJOS: HuecosDelFlujo = {
  bloques: { requisitos: BloqueDeRequisitos },
}
