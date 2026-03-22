'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useConvexAuth } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  Trophy, Coffee, Apple, Star, Gift, Check, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MapOverlayShell } from '@/components/map-overlay-shell'

interface Reward {
  id: string
  name: string
  description: string
  pointsCost: number
  discountPercent: number
  icon: typeof Coffee
  color: string
  bgColor: string
}

const REWARDS: Reward[] = [
  {
    id: 'coffee',
    name: '15% off Coffee',
    description: 'Discount at Café Botanik, Heilbronn Marktplatz',
    pointsCost: 10,
    discountPercent: 15,
    icon: Coffee,
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  {
    id: 'fruits',
    name: '10% off Fruits',
    description: 'Fresh fruits at REWE, Kaiserstraße',
    pointsCost: 30,
    discountPercent: 10,
    icon: Apple,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    id: 'exclusive',
    name: 'City Hero Badge',
    description: 'Exclusive Pigeon-eye golden badge + 20% at Stadtgalerie',
    pointsCost: 50,
    discountPercent: 20,
    icon: Star,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
]

interface RewardsShopProps {
  onBack: () => void
}

export function RewardsShop({ onBack }: RewardsShopProps) {
  const { isLoading: authLoading, isAuthenticated: convexAuthenticated } = useConvexAuth()
  const currentUser = useQuery(api.users.currentUser)
  const redeemReward = useMutation(api.coupons.redeemReward)

  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [redeemed, setRedeemed] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const isAuthenticated = convexAuthenticated && currentUser != null
  const isLoading = authLoading || (convexAuthenticated && currentUser === undefined)
  const points = currentUser?.total_points ?? 0

  const handleRedeem = async (reward: Reward) => {
    if (!currentUser) return
    setRedeeming(reward.id)
    setError(null)

    try {
      await redeemReward({
        user_id: currentUser._id,
        reward_name: reward.name,
        points_cost: reward.pointsCost,
      })
      setRedeemed((prev) => new Set(prev).add(reward.id))
    } catch (err: unknown) {
      let msg = 'Failed to redeem'
      if (err && typeof err === 'object' && 'data' in err) {
        msg = String((err as { data: unknown }).data)
      } else if (err instanceof Error) {
        msg = err.message
      }
      setError(msg)
    } finally {
      setRedeeming(null)
    }
  }

  return (
    <MapOverlayShell title="Rewards" onClose={onBack}>
      <div className="space-y-4 p-4">
        {isLoading ? (
          <div className="rounded-xl bg-card border border-border p-8 text-center text-muted-foreground">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
            <p className="text-sm">Loading…</p>
          </div>
        ) : !isAuthenticated ? (
          <div className="rounded-xl bg-card border border-border p-6 text-center text-sm text-muted-foreground">
            <Gift className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium text-card-foreground">Sign in to access rewards</p>
            <p className="mt-1">Earn points by reporting city issues</p>
          </div>
        ) : (
          <>
            {/* Points balance */}
            <div className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/80">Your Balance</p>
                  <p className="text-3xl font-bold">{points}</p>
                  <p className="text-sm text-white/80">points</p>
                </div>
                <Trophy className="h-12 w-12 text-white/30" />
              </div>
            </div>

            {/* Reward cards */}
            <div className="space-y-3">
              {REWARDS.map((reward) => {
                const Icon = reward.icon
                const canAfford = points >= reward.pointsCost
                const isRedeeming = redeeming === reward.id
                const wasRedeemed = redeemed.has(reward.id)

                return (
                  <div
                    key={reward.id}
                    className="rounded-xl bg-card border border-border p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`rounded-xl ${reward.bgColor} p-3`}>
                        <Icon className={`h-6 w-6 ${reward.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-card-foreground">{reward.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{reward.description}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            <Trophy className="h-3 w-3" />
                            {reward.pointsCost} pts
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {reward.discountPercent}% discount
                          </span>
                        </div>
                      </div>
                      {wasRedeemed ? (
                        <div className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1.5">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-xs font-semibold text-green-700">Redeemed</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          disabled={!canAfford || isRedeeming}
                          onClick={() => handleRedeem(reward)}
                          className={canAfford ? '' : 'opacity-50'}
                        >
                          {isRedeeming ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : canAfford ? (
                            'Redeem'
                          ) : (
                            `${reward.pointsCost - points} more`
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
          </>
        )}
      </div>
    </MapOverlayShell>
  )
}
