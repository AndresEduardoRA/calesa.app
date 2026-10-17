'use client'

import { useRouter } from 'next/navigation'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Bloque } from '@/shared/ui/bloque'
import { Button } from '@/shared/ui/button'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Campo } from '@/shared/ui/campo'
import { Interruptor } from '@/shared/ui/interruptor'
import { PieConSalida } from '@/shared/ui/pie-con-salida'
import type { CampoDeVehiculo } from '../../../entities/campo'
import type { Vehiculo } from '../../../entities/vehiculo'
import {
  LARGO_DE_NOTA_DE_PRECIO,
  textoDeMotivo,
  validarVitrina,
  type VistaPreviaDeVitrina as Previa,
} from '../../../entities/vitrina'
import { useVitrina } from '../hooks/use-vitrina'
import { VistaPreviaDeVitrina } from './vista-previa-de-vitrina'

type Estado = ReturnType<typeof useVitrina>

type Props = {
  vehiculo: Vehiculo
  origen: { nombre: string }
  // La fase actual, para decir por qué no se ve.
  fase: { nombre: string } | null
  campos: readonly CampoDeVehiculo[]
  // Lo que respondió la base; null si no se pudo leer (el formulario igual sirve).
  previa: Previa | null
  alCerrar: () => void
}

// Lo que pasa con el guardado, dicho arriba: sin conexión, un conflicto con otra persona o un
// rechazo que no es de ningún campo.
function AvisosDeVitrina({ estado }: { estado: Estado }) {
  const router = useRouter()
  return (
    <>
      {estado.enLinea ? null : (
        <Aviso tono="aviso">
          No hay conexión. Lo que escribiste sigue acá: guárdalo cuando vuelva.
        </Aviso>
      )}
      {estado.conflicto ? (
        <AvisoDeConflicto
          mensaje={estado.conflicto}
          alRecargar={() => {
            router.refresh()
          }}
        />
      ) : null}
      {estado.aviso ? <Aviso tono="peligro">{estado.aviso}</Aviso> : null}
    </>
  )
}

// Lo secundario, plegado: el rango, la nota y el destacado. Se abre solo si algo de adentro no pasa.
function OpcionesDeVitrina({ estado }: { estado: Estado }) {
  const { valores, porCampo } = estado
  return (
    <Bloque
      titulo="Más opciones"
      plegado
      forzarAbierto={porCampo.precioHasta !== undefined || porCampo.nota !== undefined}
    >
      <div className="grid gap-4">
        <Campo
          nombre="precioHasta"
          etiqueta="Precio hasta"
          ayuda="Para mostrar un rango: «desde – hasta»."
          inputMode="decimal"
          autoComplete="off"
          value={valores.precioHasta}
          error={porCampo.precioHasta}
          onChange={(evento) => {
            estado.cambiar({ precioHasta: evento.target.value })
          }}
        />
        <Campo
          nombre="nota"
          etiqueta="Nota del precio"
          ayuda="Una línea bajo el precio."
          maxLength={LARGO_DE_NOTA_DE_PRECIO}
          value={valores.nota}
          error={porCampo.nota}
          onChange={(evento) => {
            estado.cambiar({ nota: evento.target.value })
          }}
        />
        <Interruptor
          titulo="Destacado"
          ayuda={
            valores.publicado
              ? 'El sitio lo muestra antes que los demás.'
              : 'Sólo se destaca lo que está publicado.'
          }
          valor={valores.publicado && valores.destacado}
          deshabilitado={!valores.publicado}
          alCambiar={(destacado) => {
            estado.cambiar({ destacado })
          }}
        />
      </div>
    </Bloque>
  )
}

// Qué pasa hoy con este vehículo en el sitio, según lo que va a quedar guardado.
function EstadoEnElSitio({
  publicado,
  previa,
  nombres,
}: {
  publicado: boolean
  previa: Previa
  nombres: { origen: string; fase: string | null }
}) {
  if (previa.motivos.length === 0) {
    return publicado ? <Aviso tono="positivo">Al guardar, se ve en el sitio.</Aviso> : null
  }
  return (
    <Aviso tono={publicado ? 'aviso' : 'info'}>
      <p>
        {publicado
          ? 'Queda publicado, pero hoy no se ve en el sitio:'
          : 'Aunque lo publiques, hoy no se vería en el sitio:'}
      </p>
      <ul className="mt-1 list-disc pl-4">
        {previa.motivos.map((motivo) => (
          <li key={motivo}>{textoDeMotivo(motivo, nombres)}</li>
        ))}
      </ul>
    </Aviso>
  )
}

// Lo escrito, si es válido, se ve en la tarjeta antes de guardar; si no, lo guardado.
function precioALaVista(estado: Estado, vehiculo: Vehiculo) {
  const validacion = validarVitrina(estado.valores)
  return validacion.ok
    ? {
        precio: validacion.datos.precio,
        precioHasta: validacion.datos.precioHasta,
        nota: validacion.datos.nota,
      }
    : {
        precio: vehiculo.precioWeb,
        precioHasta: vehiculo.precioWebHasta,
        nota: vehiculo.precioWebNota,
      }
}

// El formulario de publicar: el interruptor, el precio público y, debajo, lo que verá el
// visitante. Si el envío no sale, lo escrito queda.
export function FormularioDeVitrina({ vehiculo, origen, fase, campos, previa, alCerrar }: Props) {
  const estado = useVitrina(vehiculo, alCerrar)
  const { valores } = estado
  useCambiosSinGuardar(estado.hayCambios)
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        void estado.guardar()
      }}
    >
      <AvisosDeVitrina estado={estado} />
      <Interruptor
        titulo="Publicado en la web"
        ayuda={`Con esto encendido, sale en el sitio cuando su fase publica y ${origen.nombre} está visible.`}
        valor={valores.publicado}
        alCambiar={(publicado) => {
          estado.cambiar({ publicado })
        }}
      />
      <Campo
        nombre="precio"
        etiqueta="Precio público"
        ayuda="Lo que muestra el sitio. Vacío, dice «Consultar»."
        inputMode="decimal"
        autoComplete="off"
        value={valores.precio}
        error={estado.porCampo.precio}
        onChange={(evento) => {
          estado.cambiar({ precio: evento.target.value })
        }}
      />
      <OpcionesDeVitrina estado={estado} />
      {previa ? (
        <>
          <EstadoEnElSitio
            publicado={valores.publicado}
            previa={previa}
            nombres={{ origen: origen.nombre, fase: fase?.nombre ?? null }}
          />
          <VistaPreviaDeVitrina
            tarjeta={previa.tarjeta}
            precio={precioALaVista(estado, vehiculo)}
            destacado={valores.publicado && valores.destacado}
            campos={campos}
          />
        </>
      ) : (
        <Aviso>No se pudo cargar la vista previa. Puedes guardar igual.</Aviso>
      )}
      <PieConSalida className="sticky -bottom-4 -mx-4 -mb-4 flex justify-end gap-2 border-t border-(--color-line) bg-(--color-surface) px-4 py-3">
        <Button type="button" variant="outline" className="h-11 md:h-9" onClick={alCerrar}>
          Cancelar
        </Button>
        <Button type="submit" className="h-11 md:h-9" disabled={estado.enCurso || !estado.enLinea}>
          Guardar
        </Button>
      </PieConSalida>
    </form>
  )
}
