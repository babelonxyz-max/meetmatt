import { auth } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/app/components/Card";
import { Button } from "@/app/components/Button";
import { Badge } from "@/app/components/Badge";

export default async function PricingPage() {
  const session = await auth();
  
  // Get plans from database or use defaults
  const plans = await prisma.plan.findMany({
    where: { active: true },
    orderBy: { priceMonthly: "asc" },
  });

  const defaultPlans = [
    {
      id: "starter",
      name: "Starter",
      description: "Perfect for individuals getting started",
      priceMonthly: 4900,
      priceYearly: 47000,
      features: [
        "1 AI Agent",
        "Email automation",
        "Calendar scheduling",
        "Basic integrations",
        "Email support",
      ],
      maxAgents: 1,
      popular: false,
    },
    {
      id: "pro",
      name: "Professional",
      description: "Best for professionals and small teams",
      priceMonthly: 9900,
      priceYearly: 95000,
      features: [
        "3 AI Agents",
        "All Starter features",
        "Advanced integrations",
        "Custom workflows",
        "Priority support",
        "Analytics dashboard",
      ],
      maxAgents: 3,
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "For organizations with advanced needs",
      priceMonthly: 29900,
      priceYearly: 287000,
      features: [
        "Unlimited AI Agents",
        "All Pro features",
        "Custom development",
        "Dedicated support",
        "SLA guarantee",
        "On-premise option",
      ],
      maxAgents: 100,
      popular: false,
    },
  ];

  const displayPlans = plans.length > 0 ? plans : defaultPlans;

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include a 14-day
            free trial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {displayPlans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isAuthenticated={!!session}
            />
          ))}
        </div>

        <div className="mt-20 text-center">
          <p className="text-slate-400">
            Questions? Contact us at{" "}
            <a href="mailto:matt@meetmatt.xyz" className="text-cyan-400">
              matt@meetmatt.xyz
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function PricingCard({
  plan,
  isAuthenticated,
}: {
  plan: any;
  isAuthenticated: boolean;
}) {
  const priceMonthly = (plan.priceMonthly / 100).toFixed(0);
  const priceYearly = (plan.priceYearly / 100).toFixed(0);
  const yearlySavings = Math.round(
    (plan.priceMonthly * 12 - plan.priceYearly) / 100
  );

  return (
    <Card
      className={`relative ${plan.popular ? "border-cyan-500/50" : ""}`}
      glow={plan.popular}
    >
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <Badge variant="premium">Most Popular</Badge>
        </div>
      )}
      <CardHeader>
        <h3 className="text-xl font-bold">{plan.name}</h3>
        <p className="text-slate-400 text-sm">{plan.description}</p>
      </CardHeader>
      <CardBody className="space-y-6">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold">${priceMonthly}</span>
            <span className="text-slate-400">/month</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            or ${priceYearly}/year{" "}
            <span className="text-emerald-400">(save ${yearlySavings})</span>
          </p>
        </div>

        <ul className="space-y-3">
          {plan.features.map((feature: string, i: number) => (
            <li key={i} className="flex items-start gap-3">
              <span className="text-cyan-400">✓</span>
              <span className="text-slate-300 text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        <CheckoutButton
          planId={plan.id}
          isAuthenticated={isAuthenticated}
          popular={plan.popular}
        />
      </CardBody>
    </Card>
  );
}

function CheckoutButton({
  planId,
  isAuthenticated,
  popular,
}: {
  planId: string;
  isAuthenticated: boolean;
  popular: boolean;
}) {
  if (!isAuthenticated) {
    return (
      <a href={`/auth/signin?callbackUrl=/pricing?plan=${planId}`}>
        <Button variant={popular ? "primary" : "outline"} fullWidth>
          Get Started
        </Button>
      </a>
    );
  }

  return (
    <form action="/api/stripe/checkout" method="POST" className="space-y-2">
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="interval" value="monthly" />
      <Button
        type="submit"
        variant={popular ? "primary" : "outline"}
        fullWidth
      >
        Subscribe Monthly
      </Button>
      <Button
        type="submit"
        variant="ghost"
        fullWidth
        onClick={(e) => {
          const input = e.currentTarget.form?.querySelector(
            'input[name="interval"]'
          ) as HTMLInputElement;
          if (input) input.value = "yearly";
        }}
      >
        Subscribe Yearly (Save 20%)
      </Button>
    </form>
  );
}
