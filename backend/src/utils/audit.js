// Append-only audit logger. Never throws — audit failures must not break the request flow.
// Usage:
//   await logAudit(prisma, request, 'ADMIN_CREATE', { target: 'admin', targetId: 5, details: { username: 'foo' } })
//
// For unauthenticated events (e.g. failed login), pass actorType/actorLabel explicitly.

export async function logAudit(prisma, request, action, opts = {}) {
  try {
    const u = (request && request.user) || {}
    const actorType = opts.actorType ?? (u.role === 'admin' ? 'admin' : (u.id ? 'user' : 'system'))
    const actorId = opts.actorId !== undefined ? opts.actorId : (u.id ?? null)
    const actorLabel = opts.actorLabel !== undefined ? opts.actorLabel : (u.username ?? u.npp ?? null)

    await prisma.auditLog.create({
      data: {
        actorType,
        actorId,
        actorLabel,
        action,
        target: opts.target ?? null,
        targetId: opts.targetId ?? null,
        details: opts.details ? JSON.stringify(opts.details).slice(0, 65000) : null,
        ip: request?.ip ?? null,
        userAgent: (request?.headers?.['user-agent'] ?? null)?.slice(0, 255) ?? null
      }
    })
  } catch (err) {
    // Swallow — never let audit failure break the parent request.
    console.error('Audit log failed:', err.message)
  }
}
