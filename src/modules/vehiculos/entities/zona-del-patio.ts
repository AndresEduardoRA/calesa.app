// La zona horaria del patio de una subasta (Copart, IAAI), sacada del estado o provincia de su ubicación (`location.state`, el campo
// `ubicacion_estado` de un origen de subasta). Las subastas corren en la hora del patio: con esto se puede decir «hora del patio» junto a la de
// quien mira. Un estado con dos zonas usa la de la mayoría (Texas, Florida, Indiana…), así que es una estimación: la pantalla lo dice. Sin estado
// conocido, nulo: nunca se inventa una zona. Sin I/O.
const POR_ESTADO: Readonly<Record<string, string>> = {
  // EE. UU.
  AL: 'America/Chicago',
  AK: 'America/Anchorage',
  AZ: 'America/Phoenix',
  AR: 'America/Chicago',
  CA: 'America/Los_Angeles',
  CO: 'America/Denver',
  CT: 'America/New_York',
  DE: 'America/New_York',
  DC: 'America/New_York',
  FL: 'America/New_York',
  GA: 'America/New_York',
  HI: 'Pacific/Honolulu',
  ID: 'America/Boise',
  IL: 'America/Chicago',
  IN: 'America/Indiana/Indianapolis',
  IA: 'America/Chicago',
  KS: 'America/Chicago',
  KY: 'America/New_York',
  LA: 'America/Chicago',
  ME: 'America/New_York',
  MD: 'America/New_York',
  MA: 'America/New_York',
  MI: 'America/Detroit',
  MN: 'America/Chicago',
  MS: 'America/Chicago',
  MO: 'America/Chicago',
  MT: 'America/Denver',
  NE: 'America/Chicago',
  NV: 'America/Los_Angeles',
  NH: 'America/New_York',
  NJ: 'America/New_York',
  NM: 'America/Denver',
  NY: 'America/New_York',
  NC: 'America/New_York',
  ND: 'America/Chicago',
  OH: 'America/New_York',
  OK: 'America/Chicago',
  OR: 'America/Los_Angeles',
  PA: 'America/New_York',
  RI: 'America/New_York',
  SC: 'America/New_York',
  SD: 'America/Chicago',
  TN: 'America/Chicago',
  TX: 'America/Chicago',
  UT: 'America/Denver',
  VT: 'America/New_York',
  VA: 'America/New_York',
  WA: 'America/Los_Angeles',
  WV: 'America/New_York',
  WI: 'America/Chicago',
  WY: 'America/Denver',
  PR: 'America/Puerto_Rico',
  // Canadá
  AB: 'America/Edmonton',
  BC: 'America/Vancouver',
  MB: 'America/Winnipeg',
  NB: 'America/Moncton',
  NL: 'America/St_Johns',
  NS: 'America/Halifax',
  ON: 'America/Toronto',
  PE: 'America/Halifax',
  QC: 'America/Toronto',
  SK: 'America/Regina',
}

// «TX», «tx», «TX - HOUSTON» o «Houston, TX»: el código de dos letras que se reconozca.
export function zonaDelPatio(estado: unknown): string | null {
  if (typeof estado !== 'string') return null
  const codigos = estado.toUpperCase().match(/\b[A-Z]{2}\b/g) ?? []
  for (const codigo of codigos) {
    const zona = POR_ESTADO[codigo]
    if (zona) return zona
  }
  return null
}

// La clave del campo que trae el estado del patio en un origen de subasta (el catálogo de apibara: `location.state`).
export const CLAVE_DEL_ESTADO_DEL_PATIO = 'ubicacion_estado'
