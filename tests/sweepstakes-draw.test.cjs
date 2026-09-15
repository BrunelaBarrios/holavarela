const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function load(file, mocks = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, require: id => mocks[id] || require(id), Buffer, process: { env: { ADMIN_SESSION_SECRET: 'test-only-draw-secret' } }, console,
  })
  return exports
}
const drawLib = load('app/lib/sweepstakesDraw.ts')
function fixture(entries = [{ id: 1, nombre: 'Ana', telefono: '099123456', sorteo_id: 1 }, { id: 2, nombre: 'Ana', telefono: '+59899123456', sorteo_id: 1 }, { id: 3, nombre: 'Bruno', telefono: '098123456', sorteo_id: 1 }, { id: 4, nombre: 'Otro sorteo', telefono: '097123456', sorteo_id: 2 }]) {
  const tables = { sorteo_participaciones: entries, sorteo_popup_config: [{ id: 1, titulo: 'Sorteo de prueba' }], admin_actividad: [] }
  const state = { role: 'superadmin', failSave: false, successfulDrawWrites: 0 }
  const db = { from(table) {
    let mode = 'read', payload, filters = [], order, limit, range
    const query = {
      select() { return query },
      eq(key, value) { filters.push(row => row[key] === value); return query },
      lte(key, value) { filters.push(row => row[key] <= value); return query },
      in(key, values) { filters.push(row => values.includes(row[key])); return query },
      order(key, options) { order = [key, options.ascending]; return query },
      limit(value) { limit = value; return query },
      range(a, b) { range = [a, b]; return query },
      insert(value) { mode = 'insert'; payload = value; return query },
      update(value) { mode = 'update'; payload = value; return query },
      async single() { const result = await execute(); return { data: result.data?.[0], error: result.error || (!result.data?.length ? { message: 'not found' } : null) } },
      then(resolve, reject) { return execute().then(resolve, reject) },
    }
    async function execute() {
      if (state.failSave && mode !== 'read') return { data: null, error: { message: 'storage unavailable' } }
      if (mode === 'insert') { const row = { ...payload, id: tables[table].length + 1 }; tables[table].push(row); return { data: [row], error: null } }
      let rows = tables[table].filter(row => filters.every(filter => filter(row)))
      if (mode === 'update') { for (const row of rows) { Object.assign(row, payload); if (payload.accion === 'Sorteo realizado') state.successfulDrawWrites++ } }
      if (order) rows = [...rows].sort((a, b) => (a[order[0]] - b[order[0]]) * (order[1] ? 1 : -1))
      if (range) rows = rows.slice(range[0], range[1] + 1)
      if (limit) rows = rows.slice(0, limit)
      return { data: rows.map(row => ({ ...row })), error: null }
    }
    return query
  } }
  const route = load('app/api/admin/sorteos/extraccion/route.ts', {
    'next/server': { NextResponse: { json: (data, init = {}) => ({ status: init.status || 200, data }) } },
    '../../../../lib/adminSession': { readAdminSessionFromRequest: async () => state.role ? { role: state.role, username: 'test', name: 'Test' } : null },
    '../../../../lib/supabaseAdmin': { getSupabaseAdmin: () => db },
    '../../../../lib/sweepstakesDraw': drawLib,
  })
  return { tables, state, post: body => route.POST({ json: async () => body }), get: () => route.GET({ nextUrl: new URL('https://test.invalid?campaignId=1') }) }
}

test('sampling gives every ticket an index and removes the winning person', () => {
  const tickets = [{ id: 1, name: 'A', group: 1 }, { id: 2, name: 'A', group: 1 }, { id: 3, name: 'B', group: 3 }]
  assert.deepEqual([0, 1, 2].map(index => drawLib.selectDrawWinners(tickets, 1, () => index)[0].id), [1, 2, 3])
  assert.equal(new Set(drawLib.selectDrawWinners(tickets, 2, () => 0).map(t => t.group)).size, 2)
  assert.throws(() => drawLib.selectDrawWinners(tickets, 3, () => 0))
  assert.throws(() => drawLib.selectDrawWinners(tickets, 1.5, () => 0))
  assert.equal(tickets.length, 3)
})
test('requires superadmin, validates quantity, rejects empty campaigns', async () => {
  const f = fixture(); f.state.role = 'admin'
  assert.equal((await f.post({ action: 'prepare', campaignId: 1, count: 1 })).status, 403)
  assert.equal((await f.get()).status, 403)
  f.state.role = 'superadmin'
  for (const count of [0, -1, 1.5, 101, 3]) assert.equal((await f.post({ action: 'prepare', campaignId: 1, count })).status, 400)
  assert.equal((await fixture([]).post({ action: 'prepare', campaignId: 1, count: 1 })).status, 400)
})
test('fixed campaign snapshot, phone normalization, private summary, stable result on retries', async () => {
  const f = fixture()
  const prepared = await f.post({ action: 'prepare', campaignId: 1, count: 2 })
  assert.equal(prepared.status, 200); assert.equal(prepared.data.draw.total, 3); assert.equal(prepared.data.draw.people, 2)
  assert.equal(JSON.stringify(prepared).includes('099123456'), false)
  f.tables.sorteo_participaciones.push({ id: 5, nombre: 'Late', telefono: '097987654', sorteo_id: 1 })
  const body = { action: 'draw', campaignId: 1, drawId: prepared.data.draw.id }
  const [a, b] = await Promise.all([f.post(body), f.post(body)])
  assert.equal(a.status, 200); assert.equal(b.status, 200)
  assert.equal(JSON.stringify(a.data.draw.winners), JSON.stringify(b.data.draw.winners))
  assert.equal(f.state.successfulDrawWrites, 1)
  assert.equal(a.data.draw.winners.length, 2); assert.equal(a.data.draw.total, 3)
  assert.equal(a.data.draw.winners.some(w => w.id >= 4), false)
  const history = await f.get(); assert.equal(history.data.draws[0].winners.length, 2)
  assert.equal(JSON.stringify(history).includes('telefono'), false)
  assert.equal((await f.post({ ...body, campaignId: 2 })).status, 500)
})
test('does not reveal unpersisted winners, detects tampered records', async () => {
  const f = fixture(); const prepared = await f.post({ action: 'prepare', campaignId: 1, count: 1 })
  f.state.failSave = true
  assert.equal((await f.post({ action: 'draw', campaignId: 1, drawId: prepared.data.draw.id })).status, 500)
  f.state.failSave = false
  f.tables.admin_actividad[0].detalle = '{"payload":"{}","signature":"00"}'
  assert.equal((await f.post({ action: 'draw', campaignId: 1, drawId: prepared.data.draw.id })).status, 500)
})
test('loads all pages instead of selecting only first 1000 coupons', async () => {
  const f = fixture(Array.from({ length: 1005 }, (_, i) => ({ id: i + 1, nombre: `Persona ${i}`, telefono: `${i + 100000}`, sorteo_id: 1 })))
  const result = await f.post({ action: 'prepare', campaignId: 1, count: 1 })
  assert.equal(result.status, 200); assert.equal(result.data.draw.total, 1005)
})
