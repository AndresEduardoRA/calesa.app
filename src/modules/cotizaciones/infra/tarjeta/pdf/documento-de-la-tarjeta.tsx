import 'server-only'
// `Image` de react-pdf no es un `<img>` del DOM: no lleva `alt` (el PDF no tiene árbol de accesibilidad con él); el nombre propio evita confundirlo con el de next/image.
import { Document, Image as ImagenDelPdf, Page, Text, View } from '@react-pdf/renderer'
import { formatearMonto } from '@/shared/lib/formato'
import type {
  GrupoDeTarjeta,
  ModeloDeTarjeta,
} from '../../../entities/tarjeta/modelo-de-la-tarjeta'
import { estilos } from './estilos-del-documento'
import type { LogoDelPdf } from './logo-del-pdf'

export type PropsDelDocumento = {
  modelo: ModeloDeTarjeta
  // El de la empresa: los montos van con él (P8: `formatearMonto`, el formato de `<Monto>`, y siempre con cifras).
  locale: string
  logo: LogoDelPdf | null
  // El nombre de la empresa: el autor del PDF.
  empresa: string
}

const SIN_DATO = '—'

const enUsd = (valor: number | null, locale: string) =>
  valor === null ? SIN_DATO : formatearMonto(valor, { moneda: 'USD', locale })

type Tono = ModeloDeTarjeta['tonos'][number]['claro']

function Encabezado({ modelo, logo }: Pick<PropsDelDocumento, 'modelo' | 'logo'>) {
  const e = modelo.encabezado
  const numero = e.numero === null ? '' : ` · Cotización n.º ${String(e.numero)}`
  return (
    <View style={estilos.encabezado}>
      <View style={estilos.encabezadoTexto}>
        {e.titulo === null ? null : <Text style={estilos.titulo}>{e.titulo}</Text>}
        <View style={estilos.enLinea}>
          <Text style={estilos.suave}>{`${e.fecha}${numero}`}</Text>
          {e.vencida ? <Text style={estilos.vencida}>Vencida</Text> : null}
        </View>
        {e.asesor === null ? null : <Text style={estilos.suave}>{`Asesor: ${e.asesor}`}</Text>}
      </View>
      {logo === null ? null : <ImagenDelPdf src={logo.datos} style={estilos.logo} />}
    </View>
  )
}

// El tipo de cambio y el plazo, una vez por grupo y en su línea bajo el título (la etiqueta y el valor del mismo tamaño).
function Celdas({ grupo }: { grupo: GrupoDeTarjeta }) {
  const celdas = [
    grupo.tipoDeCambio === null ? null : (['Tipo de cambio', grupo.tipoDeCambio.valor] as const),
    grupo.plazo === null ? null : (['Plazo', grupo.plazo.valor] as const),
  ].filter((c) => c !== null)
  if (celdas.length === 0) {
    return null
  }
  return (
    <View style={estilos.celdas}>
      {celdas.map(([etiqueta, valor]) => (
        <View key={etiqueta} style={estilos.enLinea}>
          <Text style={estilos.etiquetaDeCelda}>{etiqueta}</Text>
          <Text style={estilos.valorDeCelda}>{valor ?? SIN_DATO}</Text>
        </View>
      ))}
    </View>
  )
}

// Un grupo con el tono `claro` de la lectura; no se parte entre páginas.
function Grupo({
  grupo,
  tono,
  locale,
}: {
  grupo: GrupoDeTarjeta
  tono: Tono | null
  locale: string
}) {
  const color =
    tono === null ? {} : { backgroundColor: tono.fondo, borderColor: tono.borde, color: tono.tinta }
  return (
    <View style={[estilos.grupo, color]} wrap={false}>
      <Text style={estilos.tituloDelGrupo}>{grupo.etiqueta}</Text>
      <Celdas grupo={grupo} />
      {grupo.filas.map((fila) => (
        <View key={fila.nodo} style={estilos.fila}>
          <View style={estilos.etiquetaDeFila}>
            <Text>{fila.etiqueta}</Text>
            {fila.leyenda === null ? null : <Text style={estilos.leyenda}>{fila.leyenda}</Text>}
          </View>
          <Text style={estilos.monto}>{enUsd(fila.usd, locale)}</Text>
        </View>
      ))}
    </View>
  )
}

function Total({ modelo, locale }: { modelo: ModeloDeTarjeta; locale: string }) {
  const { total, aparte } = modelo
  return (
    <View style={estilos.total} wrap={false}>
      <View style={estilos.filaDelTotal}>
        <Text>{total.etiqueta}</Text>
        <Text>{enUsd(total.usd, locale)}</Text>
      </View>
      {total.leyenda === null ? null : <Text style={estilos.leyenda}>{total.leyenda}</Text>}
      {total.bs === null ? null : (
        <Text>{formatearMonto(total.bs.valor, { moneda: total.bs.moneda, locale })}</Text>
      )}
      {aparte.length === 0 ? null : (
        <View style={estilos.aparte}>
          {aparte.map((a) => (
            <View key={a.nodo} style={estilos.fila}>
              <Text>{a.etiqueta}</Text>
              <Text>{enUsd(a.usd, locale)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

// La tarjeta de una cotización en A4 (4.18-3a, C6): lo mismo que `<TarjetaDeCotizacion>` y en el mismo orden, del mismo modelo. Dibuja el modelo y nada más (no lee, no
// calcula). Los metadatos no nombran al cliente, al asesor ni al vehículo: el PDF se reenvía y no se ven al abrirlo.
export function DocumentoDeLaTarjeta({ modelo, locale, logo, empresa }: PropsDelDocumento) {
  const numero = modelo.encabezado.numero
  const tonos = new Map(modelo.tonos.map((t) => [t.clave, t.claro]))
  return (
    <Document
      title={numero === null ? 'Cotización' : `Cotización n.º ${String(numero)}`}
      author={empresa}
      creator={empresa}
    >
      <Page size="A4" style={estilos.pagina}>
        <Encabezado modelo={modelo} logo={logo} />
        {modelo.vehiculo === null ? null : <Text style={estilos.vehiculo}>{modelo.vehiculo}</Text>}
        {modelo.grupos.map((grupo) => (
          <Grupo
            key={grupo.id}
            grupo={grupo}
            tono={grupo.tono === null ? null : (tonos.get(grupo.tono) ?? null)}
            locale={locale}
          />
        ))}
        <Total modelo={modelo} locale={locale} />
        {modelo.nota === null ? null : <Text style={estilos.nota}>{modelo.nota}</Text>}
      </Page>
    </Document>
  )
}
