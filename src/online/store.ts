import { create } from 'zustand'
import type { ClientMessage, Color, Move, RoomSnapshot, ServerMessage, TimeControlId } from '@xiangqi/shared'
import { wsUrl } from '../api/base'
import { playLose, playWin } from '../audio/sound'
import { useAuth } from '../auth/store'
import { useGame } from '../store/game'

type Status = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'replaced'

interface OnlineState {
  status: Status
  /** Display name the server gave us (account name or "Khách 1234"). */
  name: string | null
  room: RoomSnapshot | null
  /** performance.now() when `room` arrived; clocks count down from it. */
  roomAt: number
  queued: TimeControlId | null
  /** One-line message for the user (errors, expiry); cleared by dismissNotice. */
  notice: string | null
  connect: () => void
  create: (color: Color | 'random', tc: TimeControlId) => void
  join: (code: string) => void
  quick: (tc: TimeControlId) => void
  cancelQuick: () => void
  move: (move: Move) => void
  resign: () => void
  draw: (action: 'offer' | 'accept' | 'decline') => void
  leave: () => void
  dismissNotice: () => void
}

const RESUME_KEY = 'xq.online'
const MAX_RETRIES = 8

const ERROR_TEXT: Record<string, string> = {
  room_not_found: 'Không tìm thấy phòng với mã này.',
  room_full: 'Phòng này đã đủ người.',
  already_in_room: 'Bạn đang ở trong một phòng khác.',
  game_in_progress: 'Hãy đầu hàng nếu muốn rời ván đang chơi.',
  draw_unavailable: 'Không thể xin hòa lúc này.',
  server_full: 'Máy chủ đang quá tải, vui lòng thử lại sau.',
}

let ws: WebSocket | null = null
let wanted = false
let retries = 0
let retryTimer: ReturnType<typeof setTimeout> | undefined
/** True while `open` awaits the auth bootstrap, before the socket exists. */
let opening = false
/** An action requested before the socket was open; sent right after the server's welcome. */
let pending: ClientMessage | null = null

const remember = (on: boolean) => {
  try {
    if (on) localStorage.setItem(RESUME_KEY, '1')
    else localStorage.removeItem(RESUME_KEY)
  } catch {
    // storage unavailable (private mode): resuming after a reload just won't happen
  }
}
export const shouldResume = (): boolean => {
  try {
    return localStorage.getItem(RESUME_KEY) === '1'
  } catch {
    return false
  }
}

export const useOnline = create<OnlineState>((set, get) => {
  const apply = (room: RoomSnapshot | null) => {
    const prev = get().room
    set({ room, roomAt: performance.now() })
    remember(room !== null && room.status !== 'finished')
    if (!room) return
    useGame.getState().syncOnline(room)
    // Checkmate already sounds via the board move; other endings (time, resignation...) need a cue.
    if (room.result && !prev?.result && room.result.reason !== 'checkmate' && room.result.winner)
      (room.result.winner === room.you ? playWin : playLose)()
  }

  const onMessage = (msg: ServerMessage) => {
    switch (msg.t) {
      case 'welcome':
        set({ name: msg.name, status: 'open' })
        apply(msg.room)
        if (pending) {
          const p = pending
          pending = null
          ws?.send(JSON.stringify(p))
        }
        return
      case 'room':
        return apply(msg.room)
      case 'left':
        set({ room: null, queued: null })
        remember(false)
        return useGame.getState().leaveOnline()
      case 'queued':
        return set({ queued: msg.tc })
      case 'dequeued':
        return set({ queued: null })
      case 'error':
        // Illegal-move errors are followed by a resync snapshot, so only surface the actionable ones.
        return void (ERROR_TEXT[msg.code] && set({ notice: ERROR_TEXT[msg.code] }))
      case 'pong':
        return
    }
  }

  const open = async () => {
    opening = true
    try {
      await useAuth.getState().init() // makes sure /api/auth/me ran, which hands out the guest cookie
    } finally {
      opening = false
    }
    if (!wanted) return
    const socket = new WebSocket(wsUrl())
    ws = socket
    socket.onopen = () => {
      retries = 0
    }
    socket.onmessage = (e) => {
      try {
        onMessage(JSON.parse(String(e.data)) as ServerMessage)
      } catch {
        // ignore a malformed frame rather than dropping the connection
      }
    }
    socket.onclose = (e) => {
      if (ws !== socket) return
      ws = null
      if (!wanted) return set({ status: 'idle' })
      if (e.code === 4000) {
        wanted = false
        return set({ status: 'replaced', notice: 'Tài khoản đang được dùng ở một tab khác.' })
      }
      if (retries >= MAX_RETRIES) {
        wanted = false
        pending = null
        return set({ status: 'idle', notice: 'Không thể kết nối tới máy chủ. Vui lòng thử lại sau.' })
      }
      const delay = Math.min(1000 * 2 ** retries++, 15_000) * (0.75 + Math.random() * 0.5)
      set({ status: 'reconnecting' })
      retryTimer = setTimeout(() => {
        retryTimer = undefined
        void open()
      }, delay)
    }
  }

  /** Sends now if connected, otherwise connects and sends after the welcome. */
  const send = (msg: ClientMessage) => {
    if (ws?.readyState === WebSocket.OPEN) return ws.send(JSON.stringify(msg))
    pending = msg
    get().connect()
  }

  return {
    status: 'idle',
    name: null,
    room: null,
    roomAt: 0,
    queued: null,
    notice: null,

    connect: () => {
      if (wanted && (ws || retryTimer || opening)) return
      wanted = true
      retries = 0
      clearTimeout(retryTimer)
      set({ status: 'connecting', notice: null })
      void open()
    },

    create: (color, tc) => send({ t: 'create', color, tc }),
    join: (code) => send({ t: 'join', code }),
    quick: (tc) => send({ t: 'quick', tc }),
    cancelQuick: () => send({ t: 'cancelQuick' }),
    move: (move) => send({ t: 'move', from: move.from, to: move.to }),
    resign: () => send({ t: 'resign' }),
    draw: (action) => send({ t: 'draw', action }),
    leave: () => send({ t: 'leave' }),
    dismissNotice: () => set({ notice: null }),
  }
})

// The game store sends moves through this hook so it never imports socket code.
useGame.setState({ sendOnlineMove: (move) => useOnline.getState().move(move) })
