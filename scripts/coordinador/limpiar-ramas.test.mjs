import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ramasPorBorrar, ramasProtegidas } from './limpiar-ramas.mjs'

const plan = {
  pasos: [
    { id: '4.22', carril: 'b' },
    { id: '4.26', carril: 'c' },
    { id: '4.27', carril: 'c' },
  ],
}

test('protege main, la rama de un paso vivo (también la de un arreglo prestado) y la de un pedido abierto', () => {
  const estado = {
    pasos: {
      4.22: { estado: 'publicado', carril: 'b' },
      4.26: { estado: 'asignado', carril: 'a', rama: 'b/4.26' },
      4.27: { estado: 'integrado', carril: 'c' },
    },
    pedidos: [
      { id: 'pedido-3', para: 'a', estado: 'asignado' },
      { id: 'pedido-1', para: 'a', estado: 'integrado' },
    ],
  }
  assert.deepEqual([...ramasProtegidas(plan, estado)].sort(), [
    'a/pedido-3',
    'b/4.22',
    'b/4.26',
    'main',
  ])
})

test('borra sólo lo integrado cuya punta es la que se integró (o quedó detrás), sin PR abierto ni protegida', () => {
  const prs = [
    { headRefName: 'fix/x', headRefOid: 'aaa', state: 'MERGED' },
    { headRefName: 'fix/empujada-despues', headRefOid: 'bbb', state: 'MERGED' },
    { headRefName: 'b/4.26', headRefOid: 'ccc', state: 'MERGED' }, // una parte
    { headRefName: 'b/4.26', headRefOid: 'ddd', state: 'OPEN' },
    { headRefName: 'fix/cerrada', headRefOid: 'eee', state: 'CLOSED' },
    { headRefName: 'c/4.27', headRefOid: 'fff', state: 'MERGED' },
    { headRefName: 'c/4.24', headRefOid: 'ggg', state: 'MERGED' },
  ]
  const ramas = [
    { nombre: 'main', sha: 'zzz' },
    { nombre: 'fix/x', sha: 'aaa' },
    { nombre: 'fix/empujada-despues', sha: 'bbb2' },
    { nombre: 'b/4.26', sha: 'ccc' },
    { nombre: 'fix/cerrada', sha: 'eee' },
    { nombre: 'c/4.27', sha: 'fff' },
    { nombre: 'c/4.24', sha: 'atras' },
    { nombre: 'sin-pr', sha: 'hhh' },
  ]
  const protegidas = new Set(['main', 'c/4.27'])
  const esAncestro = (a, b) => a === 'atras' && b === 'ggg'
  assert.deepEqual(ramasPorBorrar(ramas, prs, protegidas, esAncestro), ['fix/x', 'c/4.24'])
})
