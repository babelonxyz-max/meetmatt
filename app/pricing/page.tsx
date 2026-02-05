import { Card, CardBody, CardHeader } from "@/app/components/Card";
import { Button } from "@/app/components/Button";
import { Badge } from "@/app/components/Badge";
import Link from "next/link";

export default async function PricingPage() {
  const plans = [
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
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include a 14-day
            free trial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
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
}: {
  plan: any;
}) {
  const priceMonthly = (plan.priceMonthly / 100).toFixed(0);
  const priceYearly = (plan.priceYearly / 100).toFixed(0);
  const yearlySavings = Math.round(
    (plan.priceMonthly * 12 - plan.priceYearly) / 100
  );

  return (
    <Card
      className={`relative ${plan.popular ? "border-cyan-500/50" : ""}`}
    >
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <Badge variant="premium">Most Popular</Badge>
        </div>
      )}
      <CardHeader>
        <h3 className="text-xl font-bold text-white">{plan.name}</h3>
        <p className="text-slate-400 text-sm">{plan.description}</p>
      </CardHeader>
      <CardBody className="space-y-6">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-white">${priceMonthly}</span>
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
              <span className="text-cyan-400 mt-0.5">✓</span>
              <span className="text-slate-300 text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        <Link href="/auth/signin">
          <Button variant={plan.popular ? "primary" : "outline"} fullWidth>
            Get Started
          </Button>
        </Link>
      </CardBody>
    </Card>
  );
}
