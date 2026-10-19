// Pantalla: Configuración › Empresa (marca, monedas y tipos de cambio, integraciones, íconos). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja y nada más.
export { FormularioEmpresa } from '../features/empresa/components/formulario-empresa'
export { IconosDeLaApp } from '../features/iconos/components/iconos-de-la-app'
export { Integraciones } from '../features/integraciones/components/integraciones'
export { MonedasYTiposCambio } from '../features/tipos-cambio/components/monedas-y-tipos-cambio'
