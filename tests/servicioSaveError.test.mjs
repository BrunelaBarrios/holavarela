import test from 'node:test'
import assert from 'node:assert/strict'
import { servicioSaveError } from '../app/lib/servicioSaveError.ts'

test('plain PostgREST errors produce actionable messages without exposing database details', () => {
  assert.match(servicioSaveError({ code: 'PGRST204', message: 'private schema details' }), /estructura de servicios/)
  assert.match(servicioSaveError({ code: '42501' }), /permisos/)
  assert.match(servicioSaveError({ code: '23505' }), /único/)
  assert.match(servicioSaveError({ code: '23514' }), /valores/)
  assert.doesNotMatch(servicioSaveError({ message: 'private schema details' }), /private schema details/)
})

test('uncertain writes preserve the form and tell users to check before retrying', () => {
  for (const error of [new Error('fetch failed'), { code: '57014' }, null, undefined]) {
    assert.match(servicioSaveError(error), /verificá en otra pestaña/)
  }
})
