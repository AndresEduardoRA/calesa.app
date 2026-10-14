// Lo que se pega en el campo del teléfono, con lo que la base y su espejo tienen que contestar.
// `numero` ausente = se rechaza (y las dos tienen que decir el mismo motivo).
export type CasoDeTelefono = { cc: string | null; escrito: string; numero?: string }

export const CASOS_DE_TELEFONO: CasoDeTelefono[] = [
  // Nacional, de la empresa.
  { cc: '+591', escrito: '70011002', numero: '59170011002' },
  { cc: '+591', escrito: ' 700 11 002 ', numero: '59170011002' },
  { cc: '+591', escrito: '700-11-002', numero: '59170011002' },
  { cc: '+591', escrito: '(7) 001.1002', numero: '59170011002' },
  { cc: '+591', escrito: '070011002', numero: '59170011002' },
  { cc: '591', escrito: '70011002', numero: '59170011002' },
  { cc: ' +591 ', escrito: '70011002', numero: '59170011002' },
  // Internacional: el código de la empresa no se usa.
  { cc: '+591', escrito: '+591 70011002', numero: '59170011002' },
  { cc: '+591', escrito: '+54 9 11 5555-0000', numero: '5491155550000' },
  { cc: '+591', escrito: '0054 9 11 5555-0000', numero: '5491155550000' },
  { cc: '+591', escrito: '+1 (305) 555-0100', numero: '13055550100' },
  { cc: '+591', escrito: '001 305 555 0100', numero: '13055550100' },
  { cc: null, escrito: '+591 70011002', numero: '59170011002' },
  { cc: '', escrito: '0059170011002', numero: '59170011002' },
  // El borde de los largos: 8 y 15 dígitos con el código de país.
  { cc: '+1', escrito: '2345678', numero: '12345678' },
  { cc: '+591', escrito: '+123456789012345', numero: '123456789012345' },
  // Lo que no es un teléfono.
  { cc: '+591', escrito: '' },
  { cc: '+591', escrito: '   ' },
  { cc: '+591', escrito: '()' },
  { cc: '+591', escrito: '+' },
  { cc: '+591', escrito: '7001abcd' },
  { cc: '+591', escrito: '7001 1002 ext 5' },
  { cc: '+591', escrito: '70011002#' },
  { cc: '+591', escrito: '7001+1002' },
  { cc: '+591', escrito: '+591 +70011002' },
  { cc: '+591', escrito: '+0591 70011002' },
  { cc: '+591', escrito: '700' },
  { cc: '+591', escrito: '0' },
  { cc: '+1', escrito: '234567' },
  { cc: '+591', escrito: '+1234567890123456' },
  { cc: '+591', escrito: '1234567890123456' },
  { cc: null, escrito: '70011002' },
  { cc: '', escrito: '70011002' },
  { cc: '+', escrito: '70011002' },
]
