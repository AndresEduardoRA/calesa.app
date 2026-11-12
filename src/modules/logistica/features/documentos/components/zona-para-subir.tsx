'use client'

import { useEnLinea } from '@/shared/ui/use-en-linea'
import { ZonaDeArchivos } from '@/shared/ui/zona-de-archivos'
import { aceptarDelTipo, formatosLegibles } from '../../../entities/documentos/admision'
import type { TipoDeDocumento } from '../../../entities/documentos/documento'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { useBandeja } from '../hooks/use-bandeja'
import { useCambiosDeLaBandeja } from '../hooks/use-cambios-de-la-bandeja'
import { useSubirLaBandeja } from '../hooks/use-subir-la-bandeja'
import { Bandeja } from './bandeja'
import { CampoDelTipo, CamposDeFechasYNota } from './campos-de-la-bandeja'
import { PieDeLaBandeja } from './pie-de-la-bandeja'

type Props = {
  unidad: Unidad
  // Los tipos para elegir, con los que pide una fase primero.
  tipos: readonly TipoDeDocumento[]
  // `null` mientras se leen los permisos; `false` sin `logistica.documentos.subir` en el origen.
  puedeSubir: boolean | null
}

const SIN_PERMISO = 'Necesitas permiso para subir documentos.'
const SIN_CONEXION = 'Sin conexión: vuelve a intentarlo cuando regrese.'

function textoDelBoton(n: number, faltan: number, enCurso: boolean): string {
  if (enCurso) return 'Subiendo…'
  if (faltan > 0) return `Reintentar los ${faltan} que faltan`
  return n === 1 ? 'Subir 1 documento' : `Subir ${n} documentos`
}

// Subir documentos a la unidad (6.06-2): elegir archivos los deja en una bandeja sin subir; «Subir N documentos» sube cada objeto y recién entonces lo registra. Cerrar el panel con
// archivos en la bandeja pregunta; en la pestaña de la ficha, que no tiene panel, lo hace el navegador. Se apaga con su motivo, nunca desaparece.
export function ZonaParaSubir({ unidad, tipos, puedeSubir }: Props) {
  const b = useBandeja(tipos)
  const enLinea = useEnLinea()
  const s = useSubirLaBandeja({
    unidad,
    tipo: b.tipo,
    valores: b.valores,
    entran: b.entran,
    alRegistrar: b.quitar,
  })
  useCambiosDeLaBandeja(b.hayArchivos, b.vaciar)

  const bloqueada = puedeSubir !== true || s.enCurso || b.leyendo
  const campos = {
    tipos,
    tipo: b.tipo,
    valores: b.valores,
    errores: s.errores,
    deshabilitado: bloqueada,
    escribir: b.escribir,
  }
  const faltan = Object.keys(s.fallos).length
  const motivoDeApagado = puedeSubir === false ? SIN_PERMISO : !enLinea ? SIN_CONEXION : null
  return (
    <form
      className="grid gap-3 rounded-(--radius-card) border border-(--color-line) p-3"
      aria-label="Subir documentos"
      onSubmit={(evento) => {
        evento.preventDefault()
        void s.subir()
      }}
    >
      <h4 className="font-medium">Subir documentos</h4>
      <CampoDelTipo {...campos} />
      <ZonaDeArchivos
        aceptar={aceptarDelTipo(b.tipo)}
        alElegir={(archivos) => void b.elegir(archivos)}
        etiquetaDeElegir="Elegir archivos"
        etiquetaDeCamara="Sacar una foto"
        deshabilitada={bloqueada}
        ayuda={
          b.tipo ? `Admite ${formatosLegibles(b.tipo.formatos)}. Hasta 25 MB.` : 'Hasta 25 MB.'
        }
      />
      {motivoDeApagado ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{motivoDeApagado}</p>
      ) : null}
      <Bandeja
        entran={b.entran}
        fuera={b.fuera}
        rechazados={b.rechazados}
        fallos={s.fallos}
        deshabilitado={bloqueada}
        alQuitar={(hash) => {
          b.quitar([hash])
        }}
      />
      {b.hayArchivos ? (
        <>
          <CamposDeFechasYNota {...campos} />
          <PieDeLaBandeja
            error={s.errores['archivos']}
            avance={s.avance}
            texto={textoDelBoton(b.entran.length, faltan, s.enCurso)}
            deshabilitado={
              puedeSubir !== true || s.enCurso || b.leyendo || !enLinea || b.entran.length === 0
            }
          />
        </>
      ) : null}
    </form>
  )
}
