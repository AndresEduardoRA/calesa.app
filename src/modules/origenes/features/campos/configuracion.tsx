import {
  claveDeCampo as claveDeCampoGenerica,
  type ImpactoDeCampo,
  type ResumenDeImpacto,
} from '@/shared/lib/campos'
import { Bloque } from '@/shared/ui/bloque'
import { Campo } from '@/shared/ui/campo'
import type {
  BanderaDeCampo,
  ConfiguracionDeCampos,
  ContextoDelHueco,
  TextosDelEditor,
  ValoresDeCampo,
} from '@/shared/ui/campos'
import {
  cambiosRespectoDe,
  necesitaVistaPrevia,
  type CambiosDeCampo,
} from '../../entities/cambios-de-campo'
import { CLAVES_RESERVADAS, TIPOS_DE_CAMPO, type CampoDeLayout } from '../../entities/campo'
import { resumenDeEliminacion, resumenDeImpacto } from '../../entities/impacto'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../entities/motivos'
import { ESTILO_DE_CLAVE } from '../../entities/nombre'
import type { TipoDeOrigen } from '../../entities/origen'
import type { esquemaCrearCampo } from './schemas/campos'
import type { z } from 'zod'

type NuevoCampo = z.input<typeof esquemaCrearCampo>

const CLAVE_APIBARA = 'claveApibara'

const vacioANulo = (texto: string) => (texto.trim() === '' ? null : texto.trim())

const VALORES_DE_UN_CAMPO_NUEVO: ValoresDeCampo = {
  etiqueta: '',
  clave: '',
  tipo: 'texto',
  opciones: [],
  grupo: '',
  activo: true,
  valorDefecto: null,
  banderas: { requerido: false, enTarjeta: false, filtrable: false, publicoWeb: false },
  textos: { [CLAVE_APIBARA]: '' },
}

function valoresIniciales(campo: CampoDeLayout | null): ValoresDeCampo {
  if (campo === null) {
    return VALORES_DE_UN_CAMPO_NUEVO
  }
  return {
    etiqueta: campo.etiqueta,
    clave: campo.clave,
    tipo: campo.tipo,
    opciones: campo.opciones,
    grupo: campo.grupo ?? '',
    activo: campo.activo,
    valorDefecto: campo.valorDefecto,
    banderas: {
      requerido: campo.requerido,
      enTarjeta: campo.enTarjeta,
      filtrable: campo.filtrable,
      publicoWeb: campo.publicoWeb,
    },
    textos: { [CLAVE_APIBARA]: campo.claveApibara ?? '' },
  }
}

// Lo que la persona dejó en el formulario, medido contra lo guardado: sólo viaja lo que cambió.
function cambiosDe(campo: CampoDeLayout, valores: ValoresDeCampo): CambiosDeCampo {
  const { banderas } = valores
  return cambiosRespectoDe(campo, {
    etiqueta: valores.etiqueta.trim(),
    tipo: valores.tipo,
    opciones: valores.opciones,
    requerido: banderas['requerido'] ?? false,
    grupo: vacioANulo(valores.grupo),
    enTarjeta: banderas['enTarjeta'] ?? false,
    filtrable: banderas['filtrable'] ?? false,
    publicoWeb: banderas['publicoWeb'] ?? false,
    claveApibara: vacioANulo(valores.textos[CLAVE_APIBARA] ?? ''),
    activo: valores.activo,
    valorDefecto: valores.valorDefecto,
  })
}

const TEXTOS: TextosDelEditor = {
  titulo: 'Layout de campos',
  vacioTitulo: 'Este origen no tiene campos activos',
  vacioDescripcion:
    'Sus vehículos sólo llevarán los datos comunes: marca, modelo, año, VIN, lote y precio.',
  motivoSinPermiso: MOTIVO_SIN_PERMISO_ORIGENES,
  panelNuevo: 'Campo nuevo',
  panelDescripcionNuevo: 'Un dato propio de los vehículos de este origen.',
  panelDescripcionExistente: 'Cómo se ve y se usa este dato en los vehículos del origen.',
  claveDuplicada: 'Ya hay un campo con un nombre parecido en este origen.',
  borrador: 'origen-campo',
}

const BANDERAS: readonly BanderaDeCampo[] = [
  {
    clave: 'requerido',
    etiqueta: 'Requerido',
    ayuda: 'El vehículo no se guarda sin este dato.',
    enFila: false,
  },
  {
    clave: 'enTarjeta',
    etiqueta: 'En tarjeta',
    ayuda: 'Se muestra en la tarjeta del listado.',
    enFila: true,
  },
  {
    clave: 'filtrable',
    etiqueta: 'Filtrable',
    ayuda: 'Entra al panel de filtros del listado.',
    enFila: true,
  },
  {
    clave: 'publicoWeb',
    etiqueta: 'Público',
    ayuda: 'La web pública puede mostrarlo.',
    enFila: true,
  },
]

// El campo de apibara: de qué dato del scraper se llena al dar de alta por enlace.
function HuecoDeApibara({ valores, cambiarTexto, deshabilitado }: ContextoDelHueco) {
  return (
    <Bloque titulo="Apibara" plegado>
      <Campo
        nombre={CLAVE_APIBARA}
        etiqueta="Campo de apibara"
        autoComplete="off"
        maxLength={60}
        value={valores.textos[CLAVE_APIBARA] ?? ''}
        onChange={(evento) => {
          cambiarTexto(CLAVE_APIBARA, evento.target.value)
        }}
        ayuda="El campo del scraper del que se llena este dato al dar de alta por enlace. Déjalo vacío si se carga a mano."
        disabled={deshabilitado}
      />
    </Bloque>
  )
}

type Contenedor = { origenId: string; tipoDeOrigen: TipoDeOrigen }

// Cómo el editor compartido arma, guarda y dice el layout de campos de un origen.
export function configuracionDeOrigen({
  origenId,
  tipoDeOrigen,
}: Contenedor): ConfiguracionDeCampos<CampoDeLayout, CambiosDeCampo, NuevoCampo> {
  return {
    textos: TEXTOS,
    banderas: BANDERAS,
    tipos: TIPOS_DE_CAMPO,
    textosLibres: [CLAVE_APIBARA],
    valoresIniciales,
    claveDe: (etiqueta, existentes) =>
      claveDeCampoGenerica(etiqueta, existentes, CLAVES_RESERVADAS, ESTILO_DE_CLAVE),
    paraCrear: (valores) => ({
      origenId,
      clave: valores.clave,
      etiqueta: valores.etiqueta,
      tipo: valores.tipo,
      opciones: valores.opciones,
      requerido: valores.banderas['requerido'] ?? false,
      grupo: valores.grupo,
      enTarjeta: valores.banderas['enTarjeta'] ?? false,
      filtrable: valores.banderas['filtrable'] ?? false,
      publicoWeb: valores.banderas['publicoWeb'] ?? false,
      claveApibara: tipoDeOrigen === 'subasta' ? (valores.textos[CLAVE_APIBARA] ?? '') : null,
      valorDefecto: valores.valorDefecto,
    }),
    cambiosDe,
    conBandera: (clave, valor) => ({ [clave]: valor }),
    necesitaVistaPrevia,
    resumenDeImpacto: (campo, cambios, impacto: ImpactoDeCampo): ResumenDeImpacto =>
      resumenDeImpacto(campo, cambios, impacto),
    resumenDeEliminacion: (campo, impacto: ImpactoDeCampo): ResumenDeImpacto =>
      resumenDeEliminacion(campo, impacto),
    hueco: tipoDeOrigen === 'subasta' ? HuecoDeApibara : undefined,
  }
}
