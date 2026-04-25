// Store active WebSocket connections
const connections = new Map()

export function setupWebSocket(fastify) {
  const { prisma } = fastify

  // SECURITY: prefer authenticating the JWT at upgrade time via query string.
  // If query token absent (older client), connection is accepted but client MUST send 'auth'
  // message within AUTH_GRACE_MS or the connection is force-closed.
  const AUTH_GRACE_MS = 5000

  fastify.get('/ws/test', {
    websocket: true,
    preValidation: async (request, reply) => {
      // Optional upgrade-time auth. If token provided & invalid → reject immediately.
      // If absent → defer to message-based auth with grace timeout (handled in handler).
      const token = request.query.token
      if (token) {
        try {
          const decoded = fastify.jwt.verify(token)
          request.wsUserId = decoded.id
          request.wsSessionId = request.query.sessionId
        } catch (err) {
          return reply.code(401).send({ error: 'Invalid or expired token' })
        }
      }
    }
  }, (connection, req) => {
    const socket = connection.socket
    let userId = req.wsUserId || null
    let sessionId = req.wsSessionId || null
    let heartbeatInterval = null

    // If pre-authenticated at upgrade, register immediately.
    if (userId && sessionId) {
      connections.set(`${userId}-${sessionId}`, socket)
      console.log(`WebSocket connected (upgrade-auth): user=${userId} session=${sessionId}`)
    } else {
      // Force-close connections that don't authenticate via message within grace window.
      const graceTimer = setTimeout(() => {
        if (!userId) {
          try { socket.close(4401, 'Authentication timeout') } catch {}
        }
      }, AUTH_GRACE_MS)
      socket.once('close', () => clearTimeout(graceTimer))
    }

    // Heartbeat to keep connection alive
    heartbeatInterval = setInterval(() => {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)

    socket.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString())

        switch (data.type) {
          // Legacy auth path: older clients send token + sessionId via 'auth' message.
          case 'auth':
            // Skip if already authenticated at upgrade.
            if (userId) {
              socket.send(JSON.stringify({ type: 'auth_success', message: 'Already authenticated' }))
              break
            }
            try {
              const decoded = fastify.jwt.verify(data.token)
              userId = decoded.id
              sessionId = data.sessionId
              connections.set(`${userId}-${sessionId}`, socket)
              socket.send(JSON.stringify({ type: 'auth_success', message: 'Authenticated successfully' }))
            } catch (err) {
              socket.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }))
              try { socket.close(4401, 'Invalid token') } catch {}
            }
            break

          case 'save_answer':
            // Auto-save answer
            if (!userId || !sessionId) {
              socket.send(JSON.stringify({
                type: 'error',
                message: 'Not authenticated'
              }))
              return
            }

            try {
              const { soalId, opsiId } = data

              // Verify session belongs to user and is active
              const session = await prisma.testSession.findFirst({
                where: {
                  id: parseInt(sessionId),
                  userId,
                  isActive: true
                }
              })

              if (!session) {
                socket.send(JSON.stringify({
                  type: 'save_error',
                  message: 'Session not found or expired'
                }))
                return
              }

              // Upsert answer
              await prisma.jawaban.upsert({
                where: {
                  testSessionId_soalId: {
                    testSessionId: parseInt(sessionId),
                    soalId: parseInt(soalId)
                  }
                },
                update: { opsiId: parseInt(opsiId) },
                create: {
                  testSessionId: parseInt(sessionId),
                  soalId: parseInt(soalId),
                  opsiId: parseInt(opsiId)
                }
              })

              socket.send(JSON.stringify({
                type: 'save_success',
                soalId,
                timestamp: new Date().toISOString()
              }))
            } catch (err) {
              console.error('Save answer error:', err)
              socket.send(JSON.stringify({
                type: 'save_error',
                message: 'Failed to save answer'
              }))
            }
            break

          case 'save_bulk':
            // Bulk save answers
            if (!userId || !sessionId) {
              socket.send(JSON.stringify({
                type: 'error',
                message: 'Not authenticated'
              }))
              return
            }

            try {
              const { jawabans } = data

              // Verify session
              const session = await prisma.testSession.findFirst({
                where: {
                  id: parseInt(sessionId),
                  userId,
                  isActive: true
                }
              })

              if (!session) {
                socket.send(JSON.stringify({
                  type: 'save_error',
                  message: 'Session not found or expired'
                }))
                return
              }

              // Save all answers
              for (const [soalId, opsiId] of Object.entries(jawabans)) {
                if (opsiId) {
                  await prisma.jawaban.upsert({
                    where: {
                      testSessionId_soalId: {
                        testSessionId: parseInt(sessionId),
                        soalId: parseInt(soalId)
                      }
                    },
                    update: { opsiId: parseInt(opsiId) },
                    create: {
                      testSessionId: parseInt(sessionId),
                      soalId: parseInt(soalId),
                      opsiId: parseInt(opsiId)
                    }
                  })
                }
              }

              socket.send(JSON.stringify({
                type: 'bulk_save_success',
                count: Object.keys(jawabans).length,
                timestamp: new Date().toISOString()
              }))
            } catch (err) {
              console.error('Bulk save error:', err)
              socket.send(JSON.stringify({
                type: 'save_error',
                message: 'Failed to save answers'
              }))
            }
            break

          case 'update_progress':
            // Update current question index
            if (!userId || !sessionId) return

            try {
              await prisma.testSession.updateMany({
                where: {
                  id: parseInt(sessionId),
                  userId,
                  isActive: true
                },
                data: { currentSoal: data.currentSoal }
              })

              socket.send(JSON.stringify({
                type: 'progress_updated',
                currentSoal: data.currentSoal
              }))
            } catch (err) {
              console.error('Update progress error:', err)
            }
            break

          case 'pong':
            // Heartbeat response
            break

          default:
            socket.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type'
            }))
        }
      } catch (err) {
        console.error('WebSocket message error:', err)
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }))
      }
    })

    socket.on('close', () => {
      console.log('WebSocket client disconnected')

      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }

      if (userId && sessionId) {
        const key = `${userId}-${sessionId}`
        connections.delete(key)
      }
    })

    socket.on('error', (err) => {
      console.error('WebSocket error:', err)
    })
  })
}

// Utility to broadcast message to specific user session
export function broadcastToSession(userId, sessionId, message) {
  const key = `${userId}-${sessionId}`
  const socket = connections.get(key)
  if (socket && socket.readyState === 1) {
    socket.send(JSON.stringify(message))
  }
}

// Get active connection count
export function getConnectionCount() {
  return connections.size
}
