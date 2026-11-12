'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import type { DatosDeProyecto } from '../../../entities/proyectos/repositorio'
import { rutaDelProyecto } from '../../../entities/proyectos/rutas'
import { crearProyecto } from '../actions/crear-proyecto'

type Args = {
  // El id del intento: se conserva en cada reintento, así reenviar no duplica (la base es idempotente por id).
  intento: string
  abierto: boolean
  // Se creó: tira el borrador.
  alGuardar: () => void
  // La base rechazó campos concretos: el motivo junto a cada uno.
  alRechazarCampos: (porCampo: Record<string, string>) => void
}

const MENSAJE_DE_VALIDACION = 'Revisa los datos del proyecto.'

// El envío de un proyecto nuevo (8.09-1): por su Server Action y qué pasa con la respuesta. Sin conexión, lo escrito queda pendiente y sale solo al volver la red; un rechazo de la base
// se dice por campo o arriba del formulario. Tras crear, el drawer se cierra y se va al detalle del proyecto, donde se cargan los ítems (8.09-2; antes se quedaba en el listado, D39).
export function useEnvioDeProyecto({ intento, abierto, alGuardar, alRechazarCampos }: Args) {
  const router = useRouter()
  const [aviso, setAviso] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<DatosDeProyecto | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  async function mandar(datos: DatosDeProyecto): Promise<boolean> {
    setAviso(null)
    setEnCurso(true)
    const envio = await enviarAccion(
      crearProyecto({ id: intento, ...datos }),
      MENSAJE_DE_VALIDACION,
    )
    setEnCurso(false)
    if (envio.ok) {
      alGuardar()
      setPendiente(null)
      avisarExito(`Proyecto #${String(envio.data.numero)} creado.`)
      // Ir al detalle ya saca el panel de la pantalla: cerrarlo antes escribiría `?panel=` en la URL (nuqs, asíncrono) y pisaría el destino.
      router.push(rutaDelProyecto(envio.data.id) as Route)
      return true
    }
    if ('sinRed' in envio) {
      setPendiente(datos)
    } else if ('porCampo' in envio && envio.porCampo && Object.keys(envio.porCampo).length > 0) {
      setPendiente(null)
      alRechazarCampos(envio.porCampo)
    } else {
      setPendiente(null)
      setAviso(envio.error.mensaje)
    }
    return false
  }

  const enLinea = useReintentoAlVolver(abierto ? pendiente : null, mandar)

  return { mandar, aviso, enCurso, enLinea, esperandoConexion: pendiente !== null }
}
