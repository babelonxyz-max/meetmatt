"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/app/components/Card";
import { Button } from "@/app/components/Button";
import { Badge } from "@/app/components/Badge";

interface AffiliateStats {
  totalReferrals: number;
  activeReferrals: number;
  totalCommission: number;
  totalRevenue: number;
  referrals: Array<{
    id: string;
    code: string;
    status: string;
    commissionEarned: number;
    referred?: {
      name: string | null;
      email: string;
      createdAt: string;
    } | null;
    createdAt: string;
  }>;
}

export default function AffiliatePage() {
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Mock affiliate code - in production this comes from user data
  const affiliateCode = "MATT-ABC123";
  const referralLink = `https://meetmatt.xyz/?ref=${affiliateCode}`;

  useEffect(() => {
    // In production, fetch from /api/affiliate/stats
    // For now, use mock data
    setStats({
      totalReferrals: 0,
      activeReferrals: 0,
      totalCommission: 0,
      totalRevenue: 0,
      referrals: [],
    });
    setLoading(false);
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center text-slate-400">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
            <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
            <span>/</span>
            <span className="text-white">Affiliate Program</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Affiliate Program</h1>
          <p className="text-slate-400 mt-1">
            Earn 20% commission on every payment made by users you refer
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Referrals"
            value={stats?.totalReferrals || 0}
            icon="👥"
          />
          <StatCard
            title="Active Referrals"
            value={stats?.activeReferrals || 0}
            icon="✅"
          />
          <StatCard
            title="Total Earnings"
            value={`$${(stats?.totalCommission || 0).toFixed(2)}`}
            icon="💰"
            highlight
          />
          <StatCard
            title="Total Revenue"
            value={`$${(stats?.totalRevenue || 0).toFixed(2)}`}
            icon="📈"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Referral Link */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">Your Referral Link</h2>
              <p className="text-slate-400 text-sm">Share this link with friends and earn 20% commission</p>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <code className="flex-1 text-sm text-cyan-400 truncate">
                  {referralLink}
                </code>
                <Button
                  variant={copied ? "primary" : "outline"}
                  size="sm"
                  onClick={copyToClipboard}
                >
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>

              <div className="space-y-3 pt-4">
                <h3 className="text-sm font-medium text-white">How it works:</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">1.</span>
                    Share your unique referral link with friends
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">2.</span>
                    They sign up and subscribe to any plan
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">3.</span>
                    You earn 20% of every payment they make
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">4.</span>
                    Get paid via PayPal or crypto monthly
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Commission Rate</span>
                  <Badge variant="premium">20%</Badge>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Referral History */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">Referral History</h2>
              <p className="text-slate-400 text-sm">Track your referrals and earnings</p>
            </CardHeader>
            <CardBody>
              {stats?.referrals && stats.referrals.length > 0 ? (
                <div className="space-y-3">
                  {stats.referrals.map((referral) => (
                    <div
                      key={referral.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50"
                    >
                      <div>
                        <p className="text-white font-medium">
                          {referral.referred?.name || referral.referred?.email || "Anonymous"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(referral.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            referral.status === "active"
                              ? "success"
                              : referral.status === "pending"
                              ? "warning"
                              : "default"
                          }
                        >
                          {referral.status}
                        </Badge>
                        <p className="text-sm text-emerald-400 mt-1">
                          +${referral.commissionEarned.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🎯</div>
                  <h3 className="text-lg font-medium text-white mb-2">No referrals yet</h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Share your referral link to start earning commissions
                  </p>
                  <Button onClick={copyToClipboard}>
                    Copy Referral Link
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Promotion Tips */}
        <Card className="mt-8">
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Tips to Promote</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="text-2xl">🐦</div>
                <h3 className="font-medium text-white">Social Media</h3>
                <p className="text-sm text-slate-400">
                  Share your experience with Meet Matt on Twitter, LinkedIn, or other platforms
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl">📧</div>
                <h3 className="font-medium text-white">Email</h3>
                <p className="text-sm text-slate-400">
                  Send a personal email to friends who might benefit from an AI assistant
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl">💬</div>
                <h3 className="font-medium text-white">Communities</h3>
                <p className="text-sm text-slate-400">
                  Share in relevant Discord servers, forums, or Slack communities
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  highlight = false,
}: {
  title: string;
  value: string | number;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-cyan-500/30" : ""}>
      <CardBody>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-sm">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${highlight ? "text-cyan-400" : "text-white"}`}>
              {value}
            </p>
          </div>
          <span className="text-2xl">{icon}</span>
        </div>
      </CardBody>
    </Card>
  );
}
