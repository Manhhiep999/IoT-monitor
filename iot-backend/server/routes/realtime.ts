// ws://<host>/realtime?token=<JWT> — chỉ nhận client đã đăng nhập
export default defineWebSocketHandler({
  open(peer) {
    const url = new URL(peer.request?.url ?? '/', 'http://localhost')
    const user = verifyToken(url.searchParams.get('token'))
    if (!user) {
      peer.send(JSON.stringify({ event: 'error', data: { message: 'Unauthorized' } }))
      peer.close(4401, 'Unauthorized')
      return
    }
    addRealtimePeer(peer)
  },

  message(peer, message) {
    if (message.text() === 'ping') peer.send('pong')
  },

  close(peer) {
    removeRealtimePeer(peer)
  },

  error(peer) {
    removeRealtimePeer(peer)
  }
})
