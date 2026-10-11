import { RUTAS } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { MENSAJE_REGISTRO_CERRADO } from '../../../entities/errores-acceso'
import { EnlaceAcceso } from './enlace-acceso'

// Lo que ve quien llega a `/registro` por URL con el registro cerrado: sin formulario.
export function RegistroCerrado() {
  return (
    <div className="grid gap-4">
      <Aviso tono="aviso">{MENSAJE_REGISTRO_CERRADO}</Aviso>
      <EnlaceAcceso href={RUTAS.ingreso}>Ya tengo cuenta</EnlaceAcceso>
    </div>
  )
}
