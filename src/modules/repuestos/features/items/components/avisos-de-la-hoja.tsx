import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoVacio } from '@/shared/ui/estados'
import {
  AVISO_DE_PROYECTO_CERRADO,
  TEXTO_DEL_TOPE_DE_LA_HOJA,
  TEXTO_DE_HOJA_VACIA,
} from '../../../entities/items/hoja'

// Los avisos de la hoja (8.09-2, C12 y C13): el proyecto cerrado, el tope de 200 y el vacío de primera vez.
export function AvisoDeCerrado() {
  return (
    <Aviso tono="info">
      <p>{AVISO_DE_PROYECTO_CERRADO}</p>
    </Aviso>
  )
}

export function AvisoDeTopeDeLaHoja() {
  return <AvisoDeTope texto={TEXTO_DEL_TOPE_DE_LA_HOJA} />
}

export function HojaVacia() {
  return <EstadoVacio compacto titulo={TEXTO_DE_HOJA_VACIA} />
}
