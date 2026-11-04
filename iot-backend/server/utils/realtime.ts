/**
 * Kênh WebSocket ws://<host>/realtime — đẩy bản tin dạng { "event": ..., "data": {...} } tới mọi client đã xác thực.
 *   sensor:update  ← sensor_data
 *   device:status  ← device_response (ESP8266 đã xác nhận)
 *   action:update  ← lệnh đổi trạng thái loading / fail (Action History tự tải lại)
 */
interface RealtimePeer {
  send: (data: string) => void
}

const peers = new Set<RealtimePeer>()

export function addRealtimePeer(peer: RealtimePeer) {
  peers.add(peer)
}

export function removeRealtimePeer(peer: RealtimePeer) {
  peers.delete(peer)
}

export function broadcast(event: string, data: unknown) {
  const message = JSON.stringify({ event, data })
  for (const peer of peers) {
    try {
      peer.send(message)
    } catch {
      peers.delete(peer)
    }
  }
}

export function realtimeClientCount() {
  return peers.size
}
