'use client'

import { conteoEnFrase, type ConteoAcotado } from '@/shared/lib/conteo'
import { Bloque } from '@/shared/ui/bloque'
import { Interruptor } from '@/shared/ui/interruptor'
import { useRegional } from '@/shared/ui/regional'
import { configDeWebPublica, type Integracion } from '../../../entities/integraciones'
import { useWebPublica } from '../hooks/use-web-publica'
import { CampoSecreto } from './campo-secreto'
import { ConfigWebPublica } from './config-web-publica'
import { ProbarWebPublica } from './probar-web-publica'

type Props = {
  webPublica: Integracion
  // Cuántos vehículos publicados empiezan o dejan de verse; null si no se pudo contar.
  vehiculosQueCambian: ConteoAcotado | null
  puedeEditar: boolean
}

const AYUDA_GENERAL = 'Con la integración activa, los vehículos publicados se ven en el sitio.'

function ayudaDelInterruptor(
  activa: boolean,
  conteo: ConteoAcotado | null,
  locale: string,
): string {
  if (!conteo || conteo.n === 0) {
    return AYUDA_GENERAL
  }
  const cuantos = conteoEnFrase(conteo, { locale })
  const uno = conteo.n === 1 && !conteo.hayMas
  if (activa) {
    return uno
      ? `Al apagarla, ${cuantos} vehículo deja de verse en el sitio.`
      : `Al apagarla, ${cuantos} vehículos dejan de verse en el sitio.`
  }
  return uno
    ? `Al encenderla, ${cuantos} vehículo publicado empieza a verse en el sitio.`
    : `Al encenderla, ${cuantos} vehículos publicados empiezan a verse en el sitio.`
}

// La tarjeta «Web pública»: el interruptor, a dónde avisa la base qué cambió, el secreto que lleva
// ese aviso (va a Vault y no se vuelve a mostrar) y «Probar».
export function WebPublica({ webPublica, vehiculosQueCambian, puedeEditar }: Props) {
  const { locale } = useRegional()
  const ediciones = useWebPublica(webPublica.actualizadoEn)
  const { revalidar_url: revalidarUrl } = configDeWebPublica(webPublica.config)

  return (
    <Bloque
      titulo="Web pública"
      descripcion="Muestra en el sitio los vehículos publicados y avisa al sitio cuando algo cambia."
    >
      <Interruptor
        titulo="Activa"
        ayuda={ayudaDelInterruptor(webPublica.activa, vehiculosQueCambian, locale)}
        valor={webPublica.activa}
        alCambiar={(activa) => void ediciones.cambiarEstado(activa)}
        deshabilitado={!puedeEditar || ediciones.enCurso}
      />
      <ConfigWebPublica
        // Al guardarse, el campo vuelve a nacer con lo guardado.
        key={revalidarUrl ?? 'sin-direccion'}
        revalidarUrl={revalidarUrl}
        puedeEditar={puedeEditar}
        ediciones={ediciones}
      />
      <CampoSecreto
        key={webPublica.secretoGuardadoEn ?? 'sin-secreto'}
        clave="web_publica"
        guardadoEn={webPublica.secretoGuardadoEn}
        puedeEditar={puedeEditar}
        guardar={ediciones.guardarSecreto}
        enCurso={ediciones.enCurso}
        errores={ediciones.errores.secreto}
      />
      {puedeEditar ? (
        <ProbarWebPublica
          // Un cambio en la fila deja viejo el resultado de la prueba anterior.
          key={webPublica.actualizadoEn}
          conDireccion={revalidarUrl !== null}
          conSecreto={webPublica.secretoGuardadoEn !== null}
          ediciones={ediciones}
        />
      ) : null}
    </Bloque>
  )
}
