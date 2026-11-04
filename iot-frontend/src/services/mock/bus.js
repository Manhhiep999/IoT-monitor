// Event bus giả lập kênh WebSocket /realtime khi chạy chế độ mock
const listeners = new Map()

export function onMockEvent(event, cb) {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event).add(cb)
  return () => listeners.get(event)?.delete(cb)
}

export function emitMockEvent(event, data) {
  listeners.get(event)?.forEach((cb) => cb(data))
}
