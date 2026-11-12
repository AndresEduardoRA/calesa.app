'use client'

import { formatearNumero } from '@/shared/lib/formato'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import type { OpcionesDeGasto } from '../../../areas/dinero/composicion.client'
import { categoriasParaElegir } from '../../../entities/dinero/categoria'
import type { Gasto } from '../../../entities/dinero/gasto'
import type { TipoDeCambio } from '../../../entities/dinero/tipo-de-cambio'
import type { useFormularioDeGasto } from '../hooks/use-formulario-de-gasto'
import { CampoDeComprobante } from './campo-de-comprobante'

type Props = {
  unidadId: string
  original: Gasto | null
  opciones: OpcionesDeGasto
  formulario: ReturnType<typeof useFormularioDeGasto>
}

const TASA_CON_CUATRO_DECIMALES = 4

function etiquetaDelTipo(tipo: TipoDeCambio, locale: string): string {
  const valor = formatearNumero(tipo.valor, { locale, decimales: TASA_CON_CUATRO_DECIMALES })
  return `${tipo.nombre} · ${tipo.monedaDe} → ${tipo.monedaA} · ${valor}`
}

type Formulario = Props['formulario']

// La moneda, el monto y, si la moneda no es la base, el tipo de cambio; el equivalente guardado de un gasto que se edita va de sólo lectura y es el que devolvió la base: acá nunca se multiplica.
function CamposDeMonto({ original, opciones, formulario: f }: Omit<Props, 'unidadId'>) {
  const { locale, monedaBase } = useRegional()
  const { valores, errores, enCurso, tipos } = f
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoSeleccion
          nombre="gasto-moneda"
          etiqueta="Moneda"
          opciones={opciones.monedas.map((m) => ({
            valor: m.codigo,
            etiqueta: `${m.codigo} · ${m.nombre}`,
          }))}
          value={valores.moneda}
          onChange={(evento) => {
            f.escribir({ moneda: evento.target.value })
          }}
          error={errores['moneda']}
          disabled={enCurso}
        />
        <Campo
          nombre="gasto-monto"
          etiqueta="Monto"
          inputMode="decimal"
          autoComplete="off"
          value={valores.monto}
          onChange={(evento) => {
            f.escribir({ monto: evento.target.value })
          }}
          error={errores['monto']}
          disabled={enCurso}
        />
      </div>
      {valores.moneda !== monedaBase ? (
        <CampoSeleccion
          nombre="gasto-tipo-de-cambio"
          etiqueta="Tipo de cambio"
          opciones={[
            {
              valor: '',
              etiqueta:
                tipos.length === 0 ? 'Sin tipo de cambio activo' : 'Elige el tipo de cambio',
            },
            ...tipos.map((t) => ({ valor: t.id, etiqueta: etiquetaDelTipo(t, locale) })),
          ]}
          value={valores.tipoCambioId}
          onChange={(evento) => {
            f.escribir({ tipoCambioId: evento.target.value })
          }}
          ayuda={`La base guarda el equivalente en ${monedaBase} con el valor de este momento.`}
          error={errores['tipoCambioId']}
          disabled={enCurso}
        />
      ) : null}
      {original && original.moneda !== monedaBase && original.tipoCambioAplicado !== null ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Equivale a <Monto valor={original.montoBase} />, a{' '}
          {formatearNumero(original.tipoCambioAplicado, {
            locale,
            decimales: TASA_CON_CUATRO_DECIMALES,
          })}
          .
        </p>
      ) : null}
    </>
  )
}

function CampoDeTexto({
  clave,
  nombre,
  etiqueta,
  formulario: f,
  type,
}: {
  clave: 'fecha' | 'proveedor' | 'notas'
  nombre: string
  etiqueta: string
  formulario: Formulario
  type?: 'date'
}) {
  return (
    <Campo
      nombre={nombre}
      etiqueta={etiqueta}
      type={type}
      autoComplete="off"
      value={f.valores[clave]}
      onChange={(evento) => {
        f.escribir({ [clave]: evento.target.value })
      }}
      error={f.errores[clave]}
      disabled={f.enCurso}
    />
  )
}

// Los campos del formulario de un gasto: la categoría, el monto con su moneda, la fecha, el proveedor, las notas y el comprobante.
export function CamposDeGasto({ unidadId, original, opciones, formulario: f }: Props) {
  const categorias = categoriasParaElegir(opciones.categorias, original?.categoriaId ?? null)
  return (
    <>
      <CampoSeleccion
        nombre="gasto-categoria"
        etiqueta="Categoría"
        opciones={[
          { valor: '', etiqueta: 'Elige una categoría' },
          ...categorias.map((c) => ({
            valor: c.id,
            etiqueta: c.activo ? c.nombre : `${c.nombre} (inactiva)`,
          })),
        ]}
        value={f.valores.categoriaId}
        onChange={(evento) => {
          f.escribir({ categoriaId: evento.target.value })
        }}
        error={f.errores['categoriaId']}
        disabled={f.enCurso}
      />
      <CamposDeMonto original={original} opciones={opciones} formulario={f} />
      <CampoDeTexto
        clave="fecha"
        nombre="gasto-fecha"
        etiqueta="Fecha"
        type="date"
        formulario={f}
      />
      <CampoDeTexto
        clave="proveedor"
        nombre="gasto-proveedor"
        etiqueta="Proveedor"
        formulario={f}
      />
      <CampoDeTexto clave="notas" nombre="gasto-notas" etiqueta="Notas" formulario={f} />
      <CampoDeComprobante
        unidadId={unidadId}
        ruta={f.valores.comprobanteRuta}
        alCambiar={(ruta) => {
          f.escribir({ comprobanteRuta: ruta })
        }}
        error={f.errores['comprobanteRuta']}
        deshabilitado={f.enCurso}
      />
    </>
  )
}
