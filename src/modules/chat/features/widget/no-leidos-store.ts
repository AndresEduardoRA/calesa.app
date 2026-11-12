// El contador de no leídos del chat, uno por pestaña: lo escribe la suscripción (la burbuja y la barra lateral lo leen). Sin I/O y sin importar Supabase:
// este archivo viaja en el JS de todas las pantallas (`docs/RENDIMIENTO.md`).
const MAXIMO_DE_LA_BASE = 100

let valor = 0
const oyentes = new Set<() => void>()

export const noLeidosStore = {
  leer: (): number => valor,
  // Un valor que no es un entero de 0 a 100 se ignora: el contador conserva el último bueno.
  poner(n: number): void {
    if (!Number.isInteger(n) || n < 0 || n > MAXIMO_DE_LA_BASE || n === valor) {
      return
    }
    valor = n
    for (const oyente of oyentes) {
      oyente()
    }
  },
  suscribir(oyente: () => void): () => void {
    oyentes.add(oyente)
    return () => {
      oyentes.delete(oyente)
    }
  },
  // Para las pruebas.
  reiniciar(): void {
    valor = 0
    oyentes.clear()
  },
}
