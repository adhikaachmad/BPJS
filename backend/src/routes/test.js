import { shuffleArray } from '../utils/helpers.js'

export default async function testRoutes(fastify, options) {
  const { prisma } = fastify

  // Start a new test session
  fastify.post('/start', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { modulId } = request.body
    const userId = request.user.id

    if (!modulId) {
      return reply.status(400).send({ error: 'ModulId is required' })
    }

    // Check if user already has active session for this modul
    const existingSession = await prisma.testSession.findFirst({
      where: {
        userId,
        modulId: parseInt(modulId),
        isActive: true,
        isCompleted: false
      }
    })

    if (existingSession) {
      // Return existing session
      const modul = await prisma.modul.findUnique({
        where: { id: parseInt(modulId) },
        include: {
          soals: {
            include: { opsis: true }
          }
        }
      })

      const soalOrder = JSON.parse(existingSession.soalOrder)
      const soals = soalOrder.map(id => modul.soals.find(s => s.id === id))

      // Get existing answers
      const jawabans = await prisma.jawaban.findMany({
        where: { testSessionId: existingSession.id }
      })

      return {
        session: existingSession,
        modul,
        soals: soals.map(s => ({
          ...s,
          opsis: shuffleArray([...s.opsis]).map(o => ({
            id: o.id,
            teks: o.teks
          }))
        })),
        jawabans: jawabans.reduce((acc, j) => {
          acc[j.soalId] = j.opsiId
          return acc
        }, {}),
        resumed: true
      }
    }

    // Get modul with soals
    const modul = await prisma.modul.findUnique({
      where: { id: parseInt(modulId) },
      include: {
        soals: {
          include: { opsis: true }
        }
      }
    })

    if (!modul) {
      return reply.status(404).send({ error: 'Modul not found' })
    }

    if (modul.soals.length === 0) {
      return reply.status(400).send({ error: 'Modul has no questions' })
    }

    // Shuffle soal order
    const shuffledSoalIds = shuffleArray(modul.soals.map(s => s.id))

    // Create test session
    const session = await prisma.testSession.create({
      data: {
        userId,
        modulId: parseInt(modulId),
        soalOrder: JSON.stringify(shuffledSoalIds),
        isActive: true
      }
    })

    // Prepare soals with shuffled options (hide isCorrect)
    const soals = shuffledSoalIds.map(id => {
      const soal = modul.soals.find(s => s.id === id)
      return {
        ...soal,
        opsis: shuffleArray([...soal.opsis]).map(o => ({
          id: o.id,
          teks: o.teks
        }))
      }
    })

    return {
      session,
      modul: {
        id: modul.id,
        nama: modul.nama,
        deskripsi: modul.deskripsi,
        durasi: modul.durasi
      },
      soals,
      jawabans: {},
      resumed: false
    }
  })

  // Save answer (auto-save via WebSocket or API)
  fastify.post('/answer', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { sessionId, soalId, opsiId } = request.body
    const userId = request.user.id

    if (!sessionId || !soalId || !opsiId) {
      return reply.status(400).send({ error: 'SessionId, soalId, and opsiId are required' })
    }

    // Verify session belongs to user and is active
    const session = await prisma.testSession.findFirst({
      where: {
        id: parseInt(sessionId),
        userId,
        isActive: true
      }
    })

    if (!session) {
      return reply.status(404).send({ error: 'Active session not found' })
    }

    // Upsert answer
    const jawaban = await prisma.jawaban.upsert({
      where: {
        testSessionId_soalId: {
          testSessionId: parseInt(sessionId),
          soalId: parseInt(soalId)
        }
      },
      update: {
        opsiId: parseInt(opsiId)
      },
      create: {
        testSessionId: parseInt(sessionId),
        soalId: parseInt(soalId),
        opsiId: parseInt(opsiId)
      }
    })

    return { success: true, jawaban }
  })

  // Bulk save answers
  fastify.post('/answers/bulk', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { sessionId, jawabans } = request.body
    const userId = request.user.id

    if (!sessionId || !jawabans) {
      return reply.status(400).send({ error: 'SessionId and jawabans are required' })
    }

    // Verify session
    const session = await prisma.testSession.findFirst({
      where: {
        id: parseInt(sessionId),
        userId,
        isActive: true
      }
    })

    if (!session) {
      return reply.status(404).send({ error: 'Active session not found' })
    }

    // Upsert all answers
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

    return { success: true }
  })

  // Submit test and calculate result
  fastify.post('/submit', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { sessionId } = request.body
    const userId = request.user.id

    if (!sessionId) {
      return reply.status(400).send({ error: 'SessionId is required' })
    }

    // Get session with answers
    const session = await prisma.testSession.findFirst({
      where: {
        id: parseInt(sessionId),
        userId,
        isActive: true
      },
      include: {
        jawabans: {
          include: {
            soal: {
              include: { opsis: true }
            }
          }
        },
        modul: {
          include: {
            soals: { include: { opsis: true } }
          }
        }
      }
    })

    if (!session) {
      return reply.status(404).send({ error: 'Active session not found' })
    }

    // Calculate result
    const totalSoal = session.modul.soals.length
    let benar = 0
    let salah = 0

    for (const jawaban of session.jawabans) {
      const correctOpsi = jawaban.soal.opsis.find(o => o.isCorrect)
      if (correctOpsi && correctOpsi.id === jawaban.opsiId) {
        benar++
      } else {
        salah++
      }
    }

    // Count unanswered as wrong
    const unanswered = totalSoal - session.jawabans.length
    salah += unanswered

    const skor = totalSoal > 0 ? (benar / totalSoal) * 100 : 0

    // Update session
    await prisma.testSession.update({
      where: { id: parseInt(sessionId) },
      data: {
        isActive: false,
        isCompleted: true,
        endTime: new Date()
      }
    })

    // Create hasil test
    const hasilTest = await prisma.hasilTest.create({
      data: {
        testSessionId: parseInt(sessionId),
        totalSoal,
        benar,
        salah,
        skor
      }
    })

    return {
      hasilTest,
      summary: {
        totalSoal,
        dijawab: session.jawabans.length,
        benar,
        salah,
        tidakDijawab: unanswered,
        skor: skor.toFixed(2)
      }
    }
  })

  // Get test result
  fastify.get('/result/:sessionId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { sessionId } = request.params
    const userId = request.user.id

    const session = await prisma.testSession.findFirst({
      where: {
        id: parseInt(sessionId),
        userId
      },
      include: {
        hasilTest: true,
        modul: true,
        jawabans: {
          include: {
            soal: { include: { opsis: true } }
          }
        }
      }
    })

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' })
    }

    if (!session.hasilTest) {
      return reply.status(400).send({ error: 'Test not yet submitted' })
    }

    // Build detailed result
    const details = session.jawabans.map(j => {
      const correctOpsi = j.soal.opsis.find(o => o.isCorrect)
      const selectedOpsi = j.soal.opsis.find(o => o.id === j.opsiId)
      return {
        soal: j.soal.pertanyaan,
        jawaban: selectedOpsi?.teks,
        jawabanBenar: correctOpsi?.teks,
        isCorrect: correctOpsi?.id === j.opsiId
      }
    })

    return {
      session,
      hasilTest: session.hasilTest,
      modul: session.modul,
      details
    }
  })

  // Get user's test history
  fastify.get('/history', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const userId = request.user.id

    const sessions = await prisma.testSession.findMany({
      where: {
        userId,
        isCompleted: true
      },
      include: {
        hasilTest: true,
        modul: {
          include: {
            subKategori: {
              include: { kategori: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return sessions
  })

  // Check active session
  fastify.get('/active/:modulId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { modulId } = request.params
    const userId = request.user.id

    const session = await prisma.testSession.findFirst({
      where: {
        userId,
        modulId: parseInt(modulId),
        isActive: true
      }
    })

    return { hasActiveSession: !!session, session }
  })

  // Update current soal index
  fastify.put('/progress', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { sessionId, currentSoal } = request.body
    const userId = request.user.id

    const session = await prisma.testSession.updateMany({
      where: {
        id: parseInt(sessionId),
        userId,
        isActive: true
      },
      data: { currentSoal }
    })

    return { success: session.count > 0 }
  })

  // Get test result with pembahasan for DO-CHECK
  fastify.get('/docheck/:sessionId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { sessionId } = request.params
    const userId = request.user.id

    const session = await prisma.testSession.findFirst({
      where: {
        id: parseInt(sessionId),
        userId,
        isCompleted: true
      },
      include: {
        hasilTest: true,
        modul: {
          include: {
            subKategori: {
              include: { kategori: true }
            }
          }
        },
        jawabans: {
          include: {
            soal: { include: { opsis: true } }
          }
        }
      }
    })

    if (!session) {
      return reply.status(404).send({ error: 'Session tidak ditemukan atau belum selesai' })
    }

    // Get all soals with order from session
    const soalOrder = JSON.parse(session.soalOrder)

    // Build detailed review with pembahasan
    const review = soalOrder.map((soalId, index) => {
      const jawaban = session.jawabans.find(j => j.soalId === soalId)
      const soal = jawaban ? jawaban.soal : null

      if (!soal) {
        // Soal was not answered - get it from modul
        return null
      }

      const correctOpsi = soal.opsis.find(o => o.isCorrect)
      const selectedOpsi = jawaban ? soal.opsis.find(o => o.id === jawaban.opsiId) : null
      const isCorrect = selectedOpsi && correctOpsi && selectedOpsi.id === correctOpsi.id

      return {
        nomor: index + 1,
        soalId: soal.id,
        pertanyaan: soal.pertanyaan,
        pembahasan: soal.pembahasan,
        opsis: soal.opsis.map(o => ({
          id: o.id,
          teks: o.teks,
          isCorrect: o.isCorrect,
          isSelected: jawaban && jawaban.opsiId === o.id
        })),
        jawabanUser: selectedOpsi ? selectedOpsi.teks : '(Tidak dijawab)',
        jawabanBenar: correctOpsi ? correctOpsi.teks : null,
        isCorrect,
        isAnswered: !!jawaban
      }
    }).filter(Boolean)

    return {
      session: {
        id: session.id,
        startTime: session.startTime,
        endTime: session.endTime
      },
      hasilTest: session.hasilTest,
      modul: session.modul,
      review
    }
  })

  // Get latest completed test for a modul (for DO-CHECK access)
  fastify.get('/latest/:modulId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { modulId } = request.params
    const userId = request.user.id

    const session = await prisma.testSession.findFirst({
      where: {
        userId,
        modulId: parseInt(modulId),
        isCompleted: true
      },
      include: {
        hasilTest: true
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!session) {
      return reply.status(404).send({ error: 'Belum ada test yang selesai untuk modul ini' })
    }

    return session
  })

  // Get user progress for REKAPIN
  fastify.get('/rekapin/:subKategoriId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { subKategoriId } = request.params
    const userId = request.user.id

    // Get all moduls for this sub-kategori
    const moduls = await prisma.modul.findMany({
      where: { subKategoriId: parseInt(subKategoriId) },
      orderBy: { urutan: 'asc' }
    })

    // Get materi progress for KUPAS_TUNTAS moduls
    const kupasModuls = moduls.filter(m => m.tipe === 'KUPAS_TUNTAS')
    const materiProgress = await prisma.materiProgress.findMany({
      where: {
        userId,
        modulId: { in: kupasModuls.map(m => m.id) }
      }
    })

    // Get test sessions for JITU moduls
    const jituModuls = moduls.filter(m => m.tipe === 'JITU')
    const testSessions = await prisma.testSession.findMany({
      where: {
        userId,
        modulId: { in: jituModuls.map(m => m.id) },
        isCompleted: true
      },
      include: {
        hasilTest: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Build progress summary
    const progress = {
      materiCompleted: materiProgress.filter(p => p.isCompleted).length,
      materiTotal: kupasModuls.length,
      testsCompleted: testSessions.length,
      testsTotal: jituModuls.length,
      averageScore: 0,
      bestScore: 0,
      totalAttempts: testSessions.length
    }

    if (testSessions.length > 0) {
      const scores = testSessions.map(s => s.hasilTest?.skor || 0)
      progress.averageScore = scores.reduce((a, b) => a + b, 0) / scores.length
      progress.bestScore = Math.max(...scores)
    }

    // Build detailed progress per modul
    const modulProgress = moduls.map(modul => {
      if (modul.tipe === 'KUPAS_TUNTAS') {
        const mp = materiProgress.find(p => p.modulId === modul.id)
        return {
          modul,
          type: 'materi',
          isCompleted: mp?.isCompleted || false,
          completedAt: mp?.completedAt || null
        }
      } else if (modul.tipe === 'JITU') {
        const sessions = testSessions.filter(s => s.modulId === modul.id)
        const latestSession = sessions[0]
        return {
          modul,
          type: 'quiz',
          isCompleted: sessions.length > 0,
          attempts: sessions.length,
          latestScore: latestSession?.hasilTest?.skor || null,
          bestScore: sessions.length > 0
            ? Math.max(...sessions.map(s => s.hasilTest?.skor || 0))
            : null,
          latestAttempt: latestSession?.createdAt || null
        }
      } else {
        return {
          modul,
          type: modul.tipe.toLowerCase(),
          isCompleted: false
        }
      }
    })

    return {
      summary: progress,
      moduls: modulProgress,
      testHistory: testSessions.map(s => ({
        id: s.id,
        modulId: s.modulId,
        skor: s.hasilTest?.skor,
        benar: s.hasilTest?.benar,
        totalSoal: s.hasilTest?.totalSoal,
        createdAt: s.createdAt
      }))
    }
  })
}
