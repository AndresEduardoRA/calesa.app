'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useRef } from 'react'
import { agruparCampos } from '@/shared/lib/campos'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { RUTAS } from '@/shared/lib/rutas'
import { AvisosDelFormulario } from '@/shared/ui/avisos-del-formulario'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { BloqueDeCampos } from '@/shared/ui/campos'
import { Drawer } from '@/shared/ui/drawer'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { avisarExito } from '@/shared/ui/toasts'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { ETIQUETA_DE_TIPO_DEL_LEAD, TIPOS_DEL_LEAD } from '../../../entities/alta'
import type { CampoDeLead } from '../../../entities/campo'
import {
  CLAVE_DE_EDICION,
  campoDeEdicion,
  camposEditables,
  origenesOfrecidos,
} from '../../../entities/edicion'
import type { LeadDeFicha, OrigenConEstado } from '../../../entities/ficha'
import { useFormularioDeLead, type FormularioDeLead } from '../hooks/use-formulario-de-lead'
import { SIN_NUMEROS } from '@/shared/lib/numeros-de-lead'
import { useNumeroEscrito } from '@/shared/ui/numero-de-lead'
import { usePanelDeLead } from '../hooks/use-panel-de-lead'

type Datos = {
  ficha: LeadDeFicha
  // Todo el layout: acá se ofrecen los activos que quien edita recibe.
  campos: readonly CampoDeLead[]
  origenes: readonly OrigenConEstado[]
  zona: string
}

type Props = Datos & {
  // Quien mira puede editar este lead: sin esto el panel no se abre aunque la URL lo pida.
  puedeEditar: boolean
}

const idDe = (clave: string) => `lead-editar-${clave}`

const texto = (valor: unknown) => (typeof valor === 'string' ? valor : '')

type PropsDeFijos = {
  ficha: LeadDeFicha
  origenes: readonly OrigenConEstado[]
  estado: FormularioDeLead
}

// Los cuatro fijos que se editan acá: nombre, tipo y origen (el teléfono se cambia aparte). Un
// origen apagado que el lead ya tiene se ofrece marcado, para poder conservarlo.
function DatosFijos({ ficha, origenes, estado }: PropsDeFijos) {
  const ofrecidos = origenesOfrecidos(origenes, ficha.origenId)
  const sinOrigenes = ofrecidos.length === 0
  return (
    <>
      <Campo
        nombre={idDe(CLAVE_DE_EDICION.nombre)}
        etiqueta="Nombre"
        autoComplete="off"
        autoFocus
        value={texto(estado.valores[CLAVE_DE_EDICION.nombre])}
        onChange={(evento) => {
          estado.cambiar(CLAVE_DE_EDICION.nombre, evento.target.value)
        }}
        error={estado.errores[CLAVE_DE_EDICION.nombre]}
        disabled={estado.enCurso}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoSeleccion
          nombre={idDe(CLAVE_DE_EDICION.tipo)}
          etiqueta="Tipo"
          opciones={TIPOS_DEL_LEAD.map((tipo) => ({
            valor: tipo,
            etiqueta: ETIQUETA_DE_TIPO_DEL_LEAD[tipo],
          }))}
          value={texto(estado.valores[CLAVE_DE_EDICION.tipo])}
          onChange={(evento) => {
            estado.cambiar(CLAVE_DE_EDICION.tipo, evento.target.value)
          }}
          error={estado.errores[CLAVE_DE_EDICION.tipo]}
          disabled={estado.enCurso}
        />
        <CampoSeleccion
          nombre={idDe(CLAVE_DE_EDICION.origen)}
          etiqueta="Origen del lead"
          opciones={[
            ...(ficha.origenId === null || sinOrigenes
              ? [{ valor: '', etiqueta: 'Sin origen' }]
              : []),
            ...ofrecidos.map((origen) => ({
              valor: origen.id,
              etiqueta: origen.activo ? origen.nombre : `${origen.nombre} (inactivo)`,
            })),
          ]}
          value={texto(estado.valores[CLAVE_DE_EDICION.origen])}
          onChange={(evento) => {
            estado.cambiar(CLAVE_DE_EDICION.origen, evento.target.value)
          }}
          error={estado.errores[CLAVE_DE_EDICION.origen]}
          disabled={estado.enCurso || sinOrigenes}
        />
      </div>
    </>
  )
}

type PropsDeGrupos = {
  ficha: LeadDeFicha
  campos: readonly CampoDeLead[]
  estado: FormularioDeLead
}

// Un bloque por cada grupo del layout, con sus nombres. Uno con algo obligatorio nace abierto y uno
// con un error se abre solo; los demás, plegados.
function GruposDeCampos({ ficha, campos, estado }: PropsDeGrupos) {
  return (
    <>
      {agruparCampos(campos).map((grupo) => (
        <BloqueDeCampos
          key={grupo.nombre ?? ''}
          titulo={grupo.nombre ?? 'Otros datos'}
          campos={grupo.campos.map((campo) => campoDeEdicion(campo, ficha.atributos[campo.clave]))}
          valores={estado.valores}
          errores={estado.errores}
          alCambiar={estado.cambiar}
          deshabilitado={estado.enCurso}
          plegado={!grupo.campos.some((campo) => campo.requerido)}
        />
      ))}
    </>
  )
}

// Lo de adentro del panel. Se monta al abrirlo (y de nuevo si cambia la versión de lo que se
// edita, por ejemplo tras «Recargar»): así cada apertura arranca de lo guardado.
function Contenido({ ficha, campos, origenes, zona, alCerrar }: Datos & { alCerrar: () => void }) {
  const idFormulario = useId()
  const router = useRouter()
  const formulario = useRef<HTMLFormElement>(null)
  const editables = useMemo(
    () => camposEditables(campos, ficha.enCartera),
    [campos, ficha.enCartera],
  )
  const estado = useFormularioDeLead({
    ficha,
    campos: editables,
    origenes,
    zona,
    alGuardar: (sinCambios) => {
      if (!sinCambios) {
        avisarExito('Cambios guardados')
      }
      alCerrar()
    },
    // Sin acceso ya no hay nada que editar: el servidor vuelve a leer y muestra la pantalla de lo
    // que no se ve.
    alPerderElLead: () => {
      router.refresh()
    },
  })

  // El foco va al primer campo con un motivo, también cuando se guarda con Ctrl/Cmd+S.
  const hayErrores = Object.keys(estado.errores).length > 0
  useEffect(() => {
    if (hayErrores) {
      enfocarPrimerError(formulario.current)
    }
  }, [estado.errores, hayErrores])

  return (
    <div className="grid gap-4">
      <form
        id={idFormulario}
        ref={formulario}
        noValidate
        className="grid gap-3"
        onSubmit={(evento) => {
          evento.preventDefault()
          void estado.enviar()
        }}
      >
        <AvisosDelFormulario
          enLinea={estado.enLinea}
          esperandoConexion={estado.esperandoConexion}
          enCurso={estado.enCurso}
          conflicto={estado.conflicto}
          aviso={estado.aviso}
          hrefVer={`${RUTAS.leads}/${ficha.id}`}
          alReintentar={() => void estado.enviar()}
          alRecargar={() => {
            // Trae la versión de la otra persona: lo escrito acá se descarta a propósito.
            estado.descartarBorrador()
            router.refresh()
          }}
        />
        <DatosFijos ficha={ficha} origenes={origenes} estado={estado} />
        <GruposDeCampos ficha={ficha} campos={editables} estado={estado} />
      </form>
      <PieDelPanel idFormulario={idFormulario} enCurso={estado.enCurso} alCancelar={alCerrar} />
    </div>
  )
}

// El panel de edición de la ficha (`?panel=editar-lead`). Sólo se abre si quien mira puede editar
// este lead: sin permiso no hay botón y la URL no abre nada. Se queda a pantalla completa en el
// celular y con «Guardar» siempre a la vista.
export function PanelDeEdicion({ puedeEditar, ...datos }: Props) {
  const panel = usePanelDeLead()
  const abierto = puedeEditar && panel.abierto
  // Mientras se cierra, el panel sigue mostrando lo que tenía.
  const aLaVista = useUltimo(abierto ? datos.ficha : null)
  const ficha = abierto ? datos.ficha : aLaVista
  const numero = useNumeroEscrito(ficha?.numeros ?? SIN_NUMEROS)
  return (
    <Drawer
      abierto={abierto}
      alCerrar={panel.cerrar}
      titulo={ficha ? `Editar ${ficha.nombre}` : 'Editar lead'}
      descripcion={ficha ? (numero.principal ?? undefined) : undefined}
      ancho="amplio"
    >
      {ficha ? (
        <Contenido
          // Otra versión de lo que se edita (se recargó tras un conflicto) arranca de nuevo.
          key={`${ficha.id}-${ficha.actualizadoEn}`}
          {...datos}
          ficha={ficha}
          alCerrar={panel.cerrar}
        />
      ) : null}
    </Drawer>
  )
}
