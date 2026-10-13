// Qué le falta a un origen para funcionar. Se deriva de lo que hay (fases, fórmula, concesiones,
// integración), no de un «recién creado»: si alguien deshace algo, el paso vuelve a aparecer.
import type { OrigenConUso } from './origen'

export type ClaveDePaso = 'flujo' | 'formula' | 'permisos' | 'apibara'

export type PasoSiguiente = {
  clave: ClaveDePaso
  titulo: string
  detalle: string
  pendiente: boolean
}

// Un paso con a dónde lleva. La ruta la pone quien conoce las pantallas (`app/`): null = la
// pantalla todavía no existe. `motivoDeshabilitado` = la persona no tiene el permiso.
export type PasoConDestino = PasoSiguiente & {
  ruta: string | null
  motivoDeshabilitado: string | null
}

export function pasosDe(
  origen: OrigenConUso,
  contexto: { apibaraActiva: boolean },
): PasoSiguiente[] {
  const pasos: PasoSiguiente[] = [
    {
      clave: 'flujo',
      titulo: 'Configura el flujo',
      detalle: `El flujo de ${origen.nombre} nació sin fases: hasta que las tenga, sus vehículos no tienen por dónde avanzar.`,
      pendiente: origen.uso.fases === 0,
    },
    {
      clave: 'formula',
      titulo: 'Publica la fórmula',
      detalle: `Sin fórmula publicada no se puede cotizar un vehículo de ${origen.nombre}.`,
      pendiente: !origen.uso.formulaPublicada,
    },
    {
      clave: 'permisos',
      titulo: 'Revisa los permisos',
      detalle:
        'Ningún rol tiene permisos acotados a este origen. Los roles con permisos para todos los orígenes ya lo alcanzan.',
      pendiente: origen.uso.concesiones === 0,
    },
  ]
  if (origen.tipo === 'subasta') {
    pasos.push({
      clave: 'apibara',
      titulo: 'Activa apibara',
      detalle:
        'Sin la integración activa, un vehículo de subasta no se puede dar de alta pegando su enlace.',
      pendiente: !contexto.apibaraActiva,
    })
  }
  return pasos
}
