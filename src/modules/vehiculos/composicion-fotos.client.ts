// Composición aparte para las fotos de un vehículo donde se nombra (`FotosEnElLugar`): la usa la tarjeta, que viaja por `client.ts` a otros
// módulos (`logistica` importa `BadgeDeFase` de ahí), y no puede arrastrar el resto de `composicion.client.ts` (fotos, apibara, papelera).
export { leerFotosDelResumen } from './infra/resumen.client'
