'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { BloqueDeCampos, CampoDeFormulario } from '@/shared/ui/campos'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  CLAVE_DEL_ALTA,
  campoDelAlta,
  camposDelAlta,
  resumenDePrecargados,
  type ContextoDeAlta,
} from '../../../entities/alta'
import type { CampoDeLead } from '../../../entities/campo'
import type { AltaDeLead } from '../hooks/use-alta-de-lead'
import { CampoTelefono } from '../../telefono/components/campo-telefono'
import { LimiteDelPasoDeSeguimiento } from './limite-del-paso'
import { PasoSeguimiento } from './paso-seguimiento'

type Props = {
  id: string
  alta: AltaDeLead
  contexto: ContextoDeAlta
  campos: readonly CampoDeLead[]
  zona: string
}

const idDe = (clave: string) => `lead-${clave}`

const texto = (valor: unknown) => (typeof valor === 'string' ? valor : '')

// Lo que pasa con el guardado, dicho arriba del formulario: sin conexión, esperando para
// reintentar, o un rechazo que no es de ningún campo.
function Avisos({ alta }: { alta: AltaDeLead }) {
  return (
    <>
      {alta.enLinea ? null : (
        <Aviso tono="aviso">
          {alta.esperandoConexion
            ? 'No hay conexión. Lo que escribiste sigue acá y se va a guardar solo cuando vuelva.'
            : 'No hay conexión. Puedes seguir escribiendo: se guarda cuando vuelva.'}
        </Aviso>
      )}
      {alta.enLinea && alta.esperandoConexion ? (
        <Aviso tono="aviso">
          <p>No pudimos llegar al servidor. Lo que escribiste sigue acá.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 min-h-11 md:min-h-7"
            onClick={() => void alta.guardar()}
            disabled={alta.enCurso}
          >
            Reintentar
          </Button>
        </Aviso>
      ) : null}
      {alta.aviso ? <Aviso tono="peligro">{alta.aviso}</Aviso> : null}
    </>
  )
}

// Lo que ofrece el select de origen: los activos. Sin ninguno, una sola opción que lo dice; y si lo
// elegido ya no está entre ellos (se desactivó mientras se escribía) arranca «Elige un origen», para
// que el campo no muestre uno que no es el que se enviará.
function opcionesDeOrigen(contexto: ContextoDeAlta, elegido: string) {
  if (contexto.origenes.length === 0) {
    return [{ valor: '', etiqueta: 'Sin orígenes activos' }]
  }
  const activos = contexto.origenes.map((o) => ({ valor: o.id, etiqueta: o.nombre }))
  return contexto.origenes.some((o) => o.id === elegido)
    ? activos
    : [{ valor: '', etiqueta: 'Elige un origen' }, ...activos]
}

// Lo que ofrece el select de tipo: los activos. Si el elegido ya no está entre ellos (se desactivó mientras se escribía)
// arranca «Elige un tipo». Los nombres salen de la base.
function opcionesDeTipo(contexto: ContextoDeAlta, elegido: string) {
  const activos = contexto.tipos.map((t) => ({ valor: t.id, etiqueta: t.nombre }))
  return contexto.tipos.some((t) => t.id === elegido)
    ? activos
    : [{ valor: '', etiqueta: 'Elige un tipo' }, ...activos]
}

// Los cuatro fijos: teléfono (con su verificación), nombre, origen (el último usado) y tipo.
function DatosFijos({ alta, contexto }: Pick<Props, 'alta' | 'contexto'>) {
  const { valores, errores, enCurso, cambiar } = alta
  const sinOrigenes = contexto.origenes.length === 0
  return (
    <>
      <CampoTelefono
        id={idDe(CLAVE_DEL_ALTA.telefono)}
        valor={texto(valores[CLAVE_DEL_ALTA.telefono])}
        error={errores[CLAVE_DEL_ALTA.telefono]}
        telefono={alta.telefono}
        deshabilitado={enCurso}
        alCambiar={(valor) => {
          cambiar(CLAVE_DEL_ALTA.telefono, valor)
        }}
        alSalir={alta.revisarTelefono}
        alTomar={alta.tomar}
        pais={alta.pais}
        anuncio={alta.anuncioDelPais}
      />
      <Campo
        nombre={idDe(CLAVE_DEL_ALTA.nombre)}
        etiqueta="Nombre"
        autoComplete="off"
        value={texto(valores[CLAVE_DEL_ALTA.nombre])}
        onChange={(evento) => {
          cambiar(CLAVE_DEL_ALTA.nombre, evento.target.value)
        }}
        error={errores[CLAVE_DEL_ALTA.nombre]}
        disabled={enCurso}
      />
      <div className="grid items-start gap-3 sm:grid-cols-2">
        <CampoSeleccion
          nombre={idDe(CLAVE_DEL_ALTA.origen)}
          etiqueta="Origen del lead"
          opciones={opcionesDeOrigen(contexto, texto(valores[CLAVE_DEL_ALTA.origen]))}
          value={texto(valores[CLAVE_DEL_ALTA.origen])}
          onChange={(evento) => {
            cambiar(CLAVE_DEL_ALTA.origen, evento.target.value)
          }}
          error={errores[CLAVE_DEL_ALTA.origen]}
          ayuda={sinOrigenes ? 'No hay un origen de lead activo: se guarda sin origen.' : undefined}
          disabled={enCurso || sinOrigenes}
        />
        <CampoSeleccion
          nombre={idDe(CLAVE_DEL_ALTA.tipo)}
          etiqueta="Tipo"
          opciones={opcionesDeTipo(contexto, texto(valores[CLAVE_DEL_ALTA.tipo]))}
          value={texto(valores[CLAVE_DEL_ALTA.tipo])}
          onChange={(evento) => {
            cambiar(CLAVE_DEL_ALTA.tipo, evento.target.value)
          }}
          error={errores[CLAVE_DEL_ALTA.tipo]}
          disabled={enCurso}
        />
      </div>
    </>
  )
}

// El paso de los datos: los fijos, los campos requeridos del layout (también los propios) y, plegado
// en «Más datos» con lo precargado a la vista, todo lo demás.
function PasoDeDatos({ alta, contexto, campos }: Omit<Props, 'id' | 'zona'>) {
  const { principales, masDatos } = camposDelAlta(campos)
  return (
    <>
      <DatosFijos alta={alta} contexto={contexto} />
      {principales.map((campo) => {
        const control = campoDelAlta(campo)
        return (
          <CampoDeFormulario
            key={control.clave}
            campo={control}
            valor={alta.valores[control.clave]}
            error={alta.errores[control.clave]}
            alCambiar={(valor) => {
              alta.cambiar(control.clave, valor)
            }}
            deshabilitado={alta.enCurso}
          />
        )
      })}
      <BloqueDeCampos
        titulo="Más datos"
        descripcion={resumenDePrecargados(masDatos, alta.valores)}
        campos={masDatos.map(campoDelAlta)}
        valores={alta.valores}
        errores={alta.errores}
        alCambiar={alta.cambiar}
        deshabilitado={alta.enCurso}
        plegado
      />
    </>
  )
}

// El contenido del drawer: dos pasos en un solo formulario. El de los datos está siempre; el del primer
// seguimiento (opcional) se monta la primera vez que se abre y desde ahí queda (oculto cuando no se ve):
// lo escrito y lo plegado no se pierde al ir y volver, y los campos del seguimiento y el editor no se
// piden hasta entonces.
export function PanelDeAlta({ id, alta, contexto, campos, zona }: Props) {
  const seguimientoAbierto = useAbiertoAlgunaVez(alta.paso === 'seguimiento')
  return (
    <form
      id={id}
      noValidate
      className="grid gap-3"
      onSubmit={(evento) => {
        evento.preventDefault()
        void alta.enviar()
      }}
    >
      <Avisos alta={alta} />
      <div hidden={alta.paso !== 'datos'} className="grid gap-3">
        <PasoDeDatos alta={alta} contexto={contexto} campos={campos} />
      </div>
      <div hidden={alta.paso !== 'seguimiento'}>
        {seguimientoAbierto ? (
          <LimiteDelPasoDeSeguimiento>
            <PasoSeguimiento alta={alta} contexto={contexto} zona={zona} />
          </LimiteDelPasoDeSeguimiento>
        ) : null}
      </div>
    </form>
  )
}
