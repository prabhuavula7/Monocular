'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { UserPlus, X, ChevronDown, Shield, User, MailOpen, Loader2 } from 'lucide-react'
import { useUser } from '@clerk/nextjs'

interface Member {
  id: string
  userId: string
  role: string
  createdAt: number
  firstName: string | null
  lastName: string | null
  email: string | null
  imageUrl: string | null
}

interface Invitation {
  id: string
  email: string
  role: string
  createdAt: number
}

interface TeamData {
  members: Member[]
  invitations: Invitation[]
  isAdmin: boolean
}

const SEAT_LIMITS: Record<string, number> = {
  trial: 3, solo: 1, studio: 5, agency: Infinity,
}

function rolePill(role: string) {
  const isAdmin = role === 'org:admin'
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
        isAdmin
          ? 'text-orange bg-orange-dim border border-orange-border'
          : 'text-ink-3 bg-canvas border border-line'
      }`}
    >
      {isAdmin ? <Shield className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
      {isAdmin ? 'Admin' : 'Member'}
    </span>
  )
}

function Avatar({ member }: { member: Pick<Member, 'imageUrl' | 'firstName' | 'lastName' | 'email'> }) {
  const initial = (member.firstName?.[0] ?? member.email?.[0] ?? '?').toUpperCase()
  if (member.imageUrl) {
    return (
      <Image
        src={member.imageUrl}
        alt={member.firstName ?? 'Member'}
        width={32}
        height={32}
        className="w-8 h-8 rounded-full ring-1 ring-line flex-shrink-0"
      />
    )
  }
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
      style={{ background: '#16A34A' }}
    >
      {initial}
    </div>
  )
}

function timeAgo(ms: number) {
  const diff = Date.now() - ms
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

export default function TeamClient({
  plan,
  initialData,
}: {
  plan: string
  initialData: TeamData
}) {
  const { user } = useUser()
  const [data, setData] = useState<TeamData>(initialData)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('org:member')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const res = await fetch('/api/team')
    if (res.ok) setData(await res.json())
  }, [])

  useEffect(() => { reload() }, [reload])

  const seatLimit = SEAT_LIMITS[plan] ?? 1
  const seatUsed = data.members.length
  const atLimit = seatLimit !== Infinity && seatUsed >= seatLimit

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError('')
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const body = await res.json()
      if (!res.ok) {
        setInviteError(body.error ?? 'Failed to send invite')
        return
      }
      setInviteEmail('')
      setShowInvite(false)
      await reload()
    } finally {
      setInviting(false)
    }
  }

  async function changeRole(userId: string, role: string) {
    setActionLoading(`role-${userId}`)
    try {
      await fetch(`/api/team/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      await reload()
    } finally {
      setActionLoading(null)
    }
  }

  async function removeMember(userId: string) {
    if (!confirm('Remove this member from the organisation?')) return
    setActionLoading(`remove-${userId}`)
    try {
      await fetch(`/api/team/members/${userId}`, { method: 'DELETE' })
      await reload()
    } finally {
      setActionLoading(null)
    }
  }

  async function revokeInvitation(id: string) {
    setActionLoading(`inv-${id}`)
    try {
      await fetch(`/api/team/invitations/${id}`, { method: 'DELETE' })
      await reload()
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Team</h1>
          <p className="text-sm text-ink-3 mt-0.5">
            {seatLimit === Infinity
              ? `${seatUsed} member${seatUsed !== 1 ? 's' : ''}`
              : `${seatUsed} / ${seatLimit} seat${seatLimit !== 1 ? 's' : ''} used`}
          </p>
        </div>
        {data.isAdmin && (
          <button
            onClick={() => { setShowInvite(true); setInviteError('') }}
            disabled={atLimit}
            title={atLimit ? `Upgrade to add more than ${seatLimit} seat${seatLimit !== 1 ? 's' : ''}` : undefined}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-orange text-white text-sm font-medium hover:bg-orange-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite member
          </button>
        )}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="bg-panel border border-line rounded-2xl panel-shadow p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Invite a team member</p>
            <button
              onClick={() => { setShowInvite(false); setInviteError('') }}
              className="text-ink-3 hover:text-ink transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              placeholder="colleague@example.com"
              autoFocus
              className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder-ink-3 focus:outline-none focus:ring-2 focus:ring-orange/30 focus:border-orange/50 transition-shadow"
            />
            <div className="relative">
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="h-full rounded-lg border border-line bg-canvas pl-3 pr-8 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-orange/30 focus:border-orange/50 transition-shadow appearance-none cursor-pointer"
              >
                <option value="org:member">Member</option>
                <option value="org:admin">Admin</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-3 pointer-events-none" />
            </div>
          </div>
          {inviteError && (
            <p className="text-xs text-red-500">{inviteError}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowInvite(false); setInviteError('') }}
              className="px-3 py-2 rounded-lg border border-line text-xs font-medium text-ink-2 hover:bg-panel-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange text-white text-xs font-medium hover:bg-orange-hover transition-colors disabled:opacity-50"
            >
              {inviting && <Loader2 className="w-3 h-3 animate-spin" />}
              Send invite
            </button>
          </div>
        </div>
      )}

      {/* Pending invitations */}
      {data.isAdmin && data.invitations.length > 0 && (
        <div className="bg-panel border border-line rounded-2xl panel-shadow overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Pending invitations</p>
          </div>
          <div className="divide-y divide-line">
            {data.invitations.map(inv => (
              <div key={inv.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-canvas border border-line flex items-center justify-center flex-shrink-0">
                  <MailOpen className="w-3.5 h-3.5 text-ink-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{inv.email}</p>
                  <p className="text-xs text-ink-3 mt-0.5">Invited {timeAgo(inv.createdAt)}</p>
                </div>
                {rolePill(inv.role)}
                <button
                  onClick={() => revokeInvitation(inv.id)}
                  disabled={actionLoading === `inv-${inv.id}`}
                  className="text-ink-3 hover:text-red-500 transition-colors disabled:opacity-50 flex-shrink-0"
                  title="Revoke invitation"
                >
                  {actionLoading === `inv-${inv.id}`
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <X className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="bg-panel border border-line rounded-2xl panel-shadow overflow-hidden">
        <div className="px-5 py-3.5 border-b border-line">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Members</p>
        </div>
        <div className="divide-y divide-line">
          {data.members.map(member => {
            const isSelf = member.userId === user?.id
            const isLoading = actionLoading === `role-${member.userId}` || actionLoading === `remove-${member.userId}`

            return (
              <div key={member.id} className="px-5 py-3.5 flex items-center gap-3">
                <Avatar member={member} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-ink truncate">
                      {member.firstName || member.lastName
                        ? `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim()
                        : member.email ?? 'Unknown'}
                    </p>
                    {isSelf && (
                      <span className="text-[10px] text-ink-3 font-medium">(you)</span>
                    )}
                  </div>
                  {(member.firstName || member.lastName) && (
                    <p className="text-xs text-ink-3 mt-0.5 truncate">{member.email}</p>
                  )}
                  <p className="text-xs text-ink-3 mt-0.5">Joined {timeAgo(member.createdAt)}</p>
                </div>

                {data.isAdmin && !isSelf ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Role selector */}
                    <div className="relative">
                      <select
                        value={member.role}
                        onChange={e => changeRole(member.userId, e.target.value)}
                        disabled={isLoading}
                        className="rounded-lg border border-line bg-canvas pl-2 pr-7 py-1 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-orange/30 focus:border-orange/50 transition-shadow appearance-none cursor-pointer disabled:opacity-50"
                      >
                        <option value="org:member">Member</option>
                        <option value="org:admin">Admin</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-3 pointer-events-none" />
                    </div>
                    {/* Remove */}
                    <button
                      onClick={() => removeMember(member.userId)}
                      disabled={isLoading}
                      className="p-1.5 rounded-lg text-ink-3 hover:text-red-500 hover:bg-red-500/5 transition-colors disabled:opacity-50"
                      title="Remove member"
                    >
                      {isLoading
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <X className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ) : (
                  <div className="flex-shrink-0">
                    {rolePill(member.role)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Seat limit info for admins */}
      {data.isAdmin && seatLimit !== Infinity && (
        <p className="text-xs text-ink-3 text-center">
          {atLimit
            ? `Seat limit reached (${seatLimit}/${seatLimit}). `
            : `${seatUsed} of ${seatLimit} seats used. `}
          <a href="/pricing" className="text-orange hover:underline">Upgrade</a> to add more.
        </p>
      )}

    </div>
  )
}
