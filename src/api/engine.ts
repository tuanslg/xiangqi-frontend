import { uciToMove } from '@xiangqi/shared'
import type { Move } from '@xiangqi/shared'

export const LEVELS = [
  { id: 1, label: 'Dễ' },
  { id: 2, label: 'Trung bình' },
  { id: 3, label: 'Khó' },
  { id: 4, label: 'Siêu khó' },
] as const

export type LevelId = (typeof LEVELS)[number]['id']

/** Longest we wait for the server before the caller falls back to the local engine. */
const TIMEOUT_MS = 8_000

export class EngineUnavailableError extends Error {}

/** Asks the server's Pikafish for a move. Rejects with EngineUnavailableError on any failure. */
export async function fetchBestMove(fen: string, level: LevelId): Promise<Move> {
  let res: Response
  try {
    res = await fetch('/api/bestmove', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fen, level }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err) {
    throw new EngineUnavailableError(err instanceof Error ? err.message : 'network error')
  }
  if (!res.ok) throw new EngineUnavailableError(`server answered ${res.status}`)
  const body: unknown = await res.json().catch(() => null)
  const uci = typeof body === 'object' && body !== null && 'move' in body ? (body as { move: unknown }).move : null
  const move = typeof uci === 'string' ? uciToMove(uci) : null
  if (!move) throw new EngineUnavailableError('server sent an unreadable move')
  return move
}
