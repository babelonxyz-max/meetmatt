import { auth } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/app/components/Card";
import { Button } from "@/app/components/Button";
import { Badge } from "@/app/components/Badge";

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      subscriptions: {
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      agents: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      _count: {
        select: { agents: true },
      },
    },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  const activeSubscription = user.subscriptions[0];
  const isSubscribed = activeSubscription?.status === "active";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-slate-400 mt-1">
          Welcome back, {user.name || user.email}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Active Agents"
          value={user._count.agents}
          href="/dashboard/agents"
        />
        <StatCard
          title="Subscription"
          value={isSubscribed ? activeSubscription.plan.name : "Free"}
          badge={isSubscribed ? <Badge variant="success">Active</Badge> : null}
          href="/dashboard/billing"
        />
        <StatCard
          title="Affiliate Earnings"
          value={`$${user.affiliateEarnings.toFixed(2)}`}
          href="/dashboard/affiliate"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Agents */}
        <Card>
          <CardHeader className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Recent Agents</h2>
            <Link href="/dashboard/agents">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardBody>
            {user.agents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">No agents yet</p>
                <Link href="/deploy">
                  <Button className="mt-4">Deploy Your First Agent</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {user.agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50"
                  >
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-slate-400">{agent.type}</p>
                    </div>
                    <Badge
                      variant={
                        agent.status === "running"
                          ? "success"
                          : agent.status === "deploying"
                          ? "warning"
                          : "error"
                      }
                    >
                      {agent.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Subscription</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            {isSubscribed ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Plan</span>
                  <span className="font-medium">
                    {activeSubscription.plan.name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Billing</span>
                  <span className="font-medium capitalize">
                    {activeSubscription.interval}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Renews on</span>
                  <span className="font-medium">
                    {new Date(
                      activeSubscription.currentPeriodEnd
                    ).toLocaleDateString()}
                  </span>
                </div>
                <form action="/api/stripe/portal" method="POST">
                  <Button type="submit" variant="outline" fullWidth>
                    Manage Subscription
                  </Button>
                </form>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-slate-400 mb-4">
                  You don&apos;t have an active subscription
                </p>
                <Link href="/pricing">
                  <Button>View Plans</Button>
                </Link>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Affiliate Program */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Affiliate Program</h2>
        </CardHeader>
        <CardBody>
          <p className="text-slate-400 mb-4">
            Share your referral link and earn 20% commission on every payment
            made by users you refer.
          </p>
          <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg">
            <code className="flex-1 text-sm text-cyan-400">
              {process.env.NEXT_PUBLIC_APP_URL}/?ref={user.affiliateCode}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${process.env.NEXT_PUBLIC_APP_URL}/?ref=${user.affiliateCode}`
                );
              }}
            >
              Copy
            </Button>
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
            <p className="text-2xl font-bold">{value}</p>
            {badge}
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
