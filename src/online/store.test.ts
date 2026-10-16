import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { START_FEN } from '@xiangqi/shared'
import type { RoomSnapshot, ServerMessage } from '@xiangqi/shared'

vi.mock('../audio/sound', () => ({
  playCapture: vi.fn(), playCheck: vi.fn(), playLose: vi.fn(), playMove: vi.fn(), playWin: vi.fn(), preloadSounds: vi.fn(),
}))
vi.mock('../auth/store', () => ({ useAuth: { getState: () => ({ init: async () => {} }) } }))

class MockSocket {
  static instances: MockSocket[] = []
  static OPEN = 1
  readyState = 0
  sent: unknown[] = []
  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onclose: ((e: { code: number }) => void) | null = null
  readonly url: string
  constructor(url: string) {
    this.url = url
    MockSocket.instances.push(this)
  }
  send(data: string) {
    this.sent.push(JSON.parse(data))
  }
  // test helpers
  open() {
    this.readyState = 1
    this.onopen?.()
  }
  receive(msg: ServerMessage) {
    this.onmessage?.({ data: JSON.stringify(msg) })
  }
  drop(code = 1006) {
    this.readyState = 3
    this.onclose?.({ code })
  }
}

const store = new Map<string, string>()
vi.stubGlobal('WebSocket', MockSocket)
vi.stubGlobal('location', { protocol: 'https:', host: 'xq.example', origin: 'https://xq.example', pathname: '/', search: '' })
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
})

const snapshot = (over: Partial<RoomSnapshot> = {}): RoomSnapshot => ({
  code: 'ABC234', tc: '3+2', status: 'playing', fen: START_FEN, turn: 'red', you: 'red',
  red: { name: 'An', online: true }, black: { name: 'Binh', online: true }, lastMove: null, moveCount: 0,
  clocks: { red: 180_000, black: 180_000, serverTime: 0 }, drawOffer: null, result: null, ...over,
})

type Mod = typeof import('./store')
let mod: Mod

beforeEach(async () => {
  vi.useFakeTimers()
  MockSocket.instances = []
  store.clear()
  vi.resetModules() // the store keeps its socket in module scope
  mod = await import('./store')
})
afterEach(() => vi.useRealTimers())

const flush = () => vi.advanceTimersByTimeAsync(0)

describe('online store', () => {
  it('connects to /ws on the page host over wss', async () => {
    mod.useOnline.getState().connect()
    await flush()
    expect(MockSocket.instances).toHaveLength(1)
    expect(MockSocket.instances[0].url).toBe('wss://xq.example/ws')
  })

  it('opens exactly one socket however many times connect() / actions fire at once', async () => {
    const s = mod.useOnline.getState()
    s.connect()
    s.connect()
    s.quick('3+2')
    s.join('ABC234')
    await flush()
    expect(MockSocket.instances).toHaveLength(1)
  })

  it('sends an action requested before connecting once the welcome arrives', async () => {
    mod.useOnline.getState().create('red', '5+3')
    await flush()
    const ws = MockSocket.instances[0]
    ws.open()
    expect(ws.sent).toEqual([]) // not before the server has identified us
    ws.receive({ t: 'welcome', name: 'Khách 0042', signedIn: false, room: null })
    expect(ws.sent).toEqual([{ t: 'create', color: 'red', tc: '5+3' }])
    expect(mod.useOnline.getState()).toMatchObject({ status: 'open', name: 'Khách 0042' })
  })

  it('sends immediately when already open', async () => {
    mod.useOnline.getState().connect()
    await flush()
    const ws = MockSocket.instances[0]
    ws.open()
    ws.receive({ t: 'welcome', name: 'An', signedIn: true, room: null })
    mod.useOnline.getState().resign()
    expect(ws.sent).toEqual([{ t: 'resign' }])
  })

  it('shows a room from welcome (resume) and from later snapshots, and remembers an active game', async () => {
    mod.useOnline.getState().connect()
    await flush()
    const ws = MockSocket.instances[0]
    ws.open()
    ws.receive({ t: 'welcome', name: 'An', signedIn: false, room: snapshot() })
    expect(mod.useOnline.getState().room?.code).toBe('ABC234')
    expect(mod.shouldResume()).toBe(true)

    ws.receive({ t: 'room', room: snapshot({ status: 'finished', result: { winner: 'red', reason: 'resign' } }) })
    expect(mod.useOnline.getState().room?.status).toBe('finished')
    expect(mod.shouldResume()).toBe(false) // a finished game is not resumed after reload
  })

  it("clears the room on 'left'", async () => {
    mod.useOnline.getState().connect()
    await flush()
    const ws = MockSocket.instances[0]
    ws.open()
    ws.receive({ t: 'welcome', name: 'An', signedIn: false, room: snapshot() })
    ws.receive({ t: 'left' })
    expect(mod.useOnline.getState().room).toBeNull()
    expect(mod.shouldResume()).toBe(false)
  })

  it('tracks queueing and surfaces only actionable errors', async () => {
    mod.useOnline.getState().connect()
    await flush()
    const ws = MockSocket.instances[0]
    ws.open()
    ws.receive({ t: 'welcome', name: 'An', signedIn: false, room: null })
    ws.receive({ t: 'queued', tc: '3+2' })
    expect(mod.useOnline.getState().queued).toBe('3+2')
    ws.receive({ t: 'dequeued' })
    expect(mod.useOnline.getState().queued).toBeNull()

    ws.receive({ t: 'error', code: 'illegal', message: 'x' })
    expect(mod.useOnline.getState().notice).toBeNull()
    ws.receive({ t: 'error', code: 'room_not_found', message: 'x' })
    expect(mod.useOnline.getState().notice).toMatch(/Không tìm thấy phòng/)
  })

  it('reconnects with backoff after an unexpected close, then resets the backoff on success', async () => {
    mod.useOnline.getState().connect()
    await flush()
    MockSocket.instances[0].drop()
    expect(mod.useOnline.getState().status).toBe('reconnecting')
    await vi.advanceTimersByTimeAsync(1_500)
    expect(MockSocket.instances).toHaveLength(2)

    MockSocket.instances[1].open()
    MockSocket.instances[1].drop()
    await vi.advanceTimersByTimeAsync(1_500) // first retry delay again, not doubled
    expect(MockSocket.instances).toHaveLength(3)
  })

  it('gives up after repeated failures with a message', async () => {
    mod.useOnline.getState().connect()
    await flush()
    for (let i = 0; i < 20; i++) {
      MockSocket.instances.at(-1)!.drop()
      await vi.advanceTimersByTimeAsync(20_000)
    }
    const s = mod.useOnline.getState()
    expect(s.status).toBe('idle')
    expect(s.notice).toMatch(/Không thể kết nối/)
    expect(MockSocket.instances.length).toBeLessThanOrEqual(10)
  })

  it('stops reconnecting when the server replaced this tab', async () => {
    mod.useOnline.getState().connect()
    await flush()
    MockSocket.instances[0].drop(4000)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(MockSocket.instances).toHaveLength(1)
    expect(mod.useOnline.getState()).toMatchObject({ status: 'replaced', notice: expect.stringContaining('tab khác') })
  })

  it('ignores garbage frames without dropping the connection', async () => {
    mod.useOnline.getState().connect()
    await flush()
    const ws = MockSocket.instances[0]
    ws.open()
    ws.onmessage?.({ data: '{not json' })
    ws.receive({ t: 'welcome', name: 'An', signedIn: false, room: null })
    expect(mod.useOnline.getState().status).toBe('open')
  })
})
