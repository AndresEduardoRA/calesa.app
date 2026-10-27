import { flushSync } from 'react-dom'

// Antes de guardar, la celda que está abierta se confirma como con `Enter` (el contrato público de la `XCell`: no se toca). Con un número la entrada se cierra; con lo que no
// es un número sigue abierta con su aviso (`aria-invalid`) y no se guarda. No se mira si hubo `onCommit`: abrir y salir sin cambiar no emite, y vale guardar.
export function confirmarCeldaAbierta(
  raiz: HTMLElement | null,
): 'ninguna' | 'confirmada' | 'invalida' {
  const entrada = raiz?.querySelector<HTMLInputElement>('input[data-seleccion]')
  if (!entrada) {
    return 'ninguna'
  }
  flushSync(() => {
    entrada.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )
  })
  return entrada.isConnected ? 'invalida' : 'confirmada'
}
