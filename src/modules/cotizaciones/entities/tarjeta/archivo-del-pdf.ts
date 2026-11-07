// El nombre del archivo del PDF de una cotización (4.18-3a, C2): `cotizacion-<n>.pdf`, con el número sin separador de miles (como en «N.º n») y nada más: ni el cliente ni el
// vehículo, que viajarían en el nombre al reenviarlo. Un número que no es el de una cotización no arma un nombre.
export function archivoDelPdf(numero: number): string | null {
  return Number.isSafeInteger(numero) && numero > 0 ? `cotizacion-${String(numero)}.pdf` : null
}
