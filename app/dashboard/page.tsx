import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/app/components/Card";
import { Button } from "@/app/components/Button";
import { Badge } from "@/app/components/Badge";

// Mock data for demo - in production this would come from database
const mockUser = {
  name: "User",
  email: "user@example.com",
  affiliateCode: "MATT-ABC123",
  affiliateEarnings: 0,
  _count: { agents: 0 },
  subscriptions: [],
  agents: [],
};

export default async function DashboardPage() {
  const user = mockUser;
  const isSubscribed = false;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">
          Welcome back, {user.name || user.email}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Active Agents"
          value={user._count.agents}
          href="/"
        />
        <StatCard
          title="Subscription"
          value={isSubscribed ? "Active" : "Free"}
          badge={isSubscribed ? <Badge variant="success">Active</Badge> : null}
          href="/pricing"
        />
        <StatCard
          title="Affiliate Earnings"
          value={`$${user.affiliateEarnings.toFixed(2)}`}
          href="/pricing"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Agents */}
        <Card>
          <CardHeader className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Recent Agents</h2>
            <Link href="/">
              <Button variant="ghost" size="sm">Deploy New</Button>
            </Link>
          </CardHeader>
          <CardBody>
            {user.agents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">No agents yet</p>
                <Link href="/">
                  <Button className="mt-4">Deploy Your First Agent</Button>
                </Link>
              </div>
            ) : null}
          </CardBody>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Subscription</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="text-center py-4">
              <p className="text-slate-400 mb-4">
                You don&apos;t have an active subscription
              </p>
              <Link href="/pricing">
                <Button>View Plans</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Affiliate Program */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-white">Affiliate Program</h2>
        </CardHeader>
        <CardBody>
          <p className="text-slate-400 mb-4">
            Share your referral link and earn 20% commission on every payment
            made by users you refer.
          </p>
          <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg">
            <code className="flex-1 text-sm text-cyan-400">
              https://meetmatt.xyz/?ref={user.affiliateCode}
            </code>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  href,
  badge,
}: {
  title: string;
  value: string | number;
  href: string;
  badge?: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-cyan-500/30 transition-colors cursor-pointer h-full">
        <CardBody>
          <p className="text-slate-400 text-sm">{title}</p>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-2xl font-bold text-white">{value}</p>
            {badge}
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
