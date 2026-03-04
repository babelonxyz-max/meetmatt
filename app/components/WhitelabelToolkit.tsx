"use client";

import { useMemo, useState } from "react";
import { Download, Copy, CheckCircle2, Palette, Globe, ShieldCheck } from "lucide-react";

type DeploymentTemplate = "assistant" | "fleet";
type BrandTone = "professional" | "friendly" | "technical";

interface WhitelabelPreset {
  id: string;
  label: string;
  description: string;
  config: ToolkitConfig;
}

interface ToolkitConfig {
  brandName: string;
  tagline: string;
  domain: string;
  supportEmail: string;
  deploymentTemplate: DeploymentTemplate;
  tone: BrandTone;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  foregroundColor: string;
}

const PRESETS: WhitelabelPreset[] = [
  {
    id: "agency",
    label: "Agency",
    description: "For agencies running Matt for clients.",
    config: {
      brandName: "Agency Matt",
      tagline: "AI operations, branded for every client",
      domain: "agencymatt.ai",
      supportEmail: "ops@agencymatt.ai",
      deploymentTemplate: "fleet",
      tone: "professional",
      primaryColor: "#3b82f6",
      secondaryColor: "#8b5cf6",
      accentColor: "#22d3ee",
      backgroundColor: "#09090b",
      foregroundColor: "#f8fafc",
    },
  },
  {
    id: "saas",
    label: "SaaS",
    description: "Embedded assistant for B2B SaaS platforms.",
    config: {
      brandName: "Nimbus Assist",
      tagline: "Ship concierge-grade AI support",
      domain: "assist.nimbus.io",
      supportEmail: "help@nimbus.io",
      deploymentTemplate: "assistant",
      tone: "technical",
      primaryColor: "#2563eb",
      secondaryColor: "#0ea5e9",
      accentColor: "#6366f1",
      backgroundColor: "#0b1020",
      foregroundColor: "#e5edff",
    },
  },
  {
    id: "creator",
    label: "Creator",
    description: "Lightweight branded concierge for creators.",
    config: {
      brandName: "Studio Matt",
      tagline: "Your AI studio manager, 24/7",
      domain: "studio.mattops.com",
      supportEmail: "hello@mattops.com",
      deploymentTemplate: "assistant",
      tone: "friendly",
      primaryColor: "#a855f7",
      secondaryColor: "#ec4899",
      accentColor: "#f59e0b",
      backgroundColor: "#140f1f",
      foregroundColor: "#fff8ff",
    },
  },
];

const toneCopy: Record<BrandTone, string> = {
  professional: "Clear, concise, business-first responses.",
  friendly: "Warm, supportive, plain-language responses.",
  technical: "Precise, system-level, implementation-focused responses.",
};

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "matt-brand";
}

function buildThemeCss(config: ToolkitConfig) {
  return `:root {
  --brand-name: "${config.brandName}";
  --brand-primary: ${config.primaryColor};
  --brand-secondary: ${config.secondaryColor};
  --brand-accent: ${config.accentColor};
  --brand-background: ${config.backgroundColor};
  --brand-foreground: ${config.foregroundColor};
  --brand-radius: 14px;
  --brand-shadow: 0 16px 60px rgba(0, 0, 0, 0.32);
}

.brand-shell {
  background: var(--brand-background);
  color: var(--brand-foreground);
}

.brand-cta {
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  color: #fff;
  border-radius: var(--brand-radius);
  box-shadow: var(--brand-shadow);
}

.brand-chip {
  border: 1px solid color-mix(in srgb, var(--brand-accent) 45%, transparent);
  background: color-mix(in srgb, var(--brand-accent) 14%, transparent);
}`;
}

function buildChecklist(config: ToolkitConfig) {
  return `# ${config.brandName} Whitelabel Launch Checklist

## Brand Setup
- [ ] Configure production domain: ${config.domain}
- [ ] Set support mailbox: ${config.supportEmail}
- [ ] Apply tone preset: ${config.tone}
- [ ] Confirm logo + favicon package

## Technical Setup
- [ ] Point DNS for ${config.domain}
- [ ] Add SSL certificate
- [ ] Set NEXT_PUBLIC_APP_URL to https://${config.domain}
- [ ] Configure webhook secrets and payment keys

## QA
- [ ] Validate onboarding flow end-to-end
- [ ] Validate payment callback + deployment trigger
- [ ] Validate legal pages (privacy/terms/security)
- [ ] Run smoke test on mobile and desktop

## Go Live
- [ ] Enable monitoring alerts
- [ ] Announce launch to customers
- [ ] Track first 50 whitelabel deployments
`;
}

export function WhitelabelToolkit() {
  const [config, setConfig] = useState<ToolkitConfig>(PRESETS[0].config);
  const [notice, setNotice] = useState<string>("");

  const artifacts = useMemo(() => {
    const slug = slugify(config.brandName);

    const manifest = {
      name: config.brandName,
      slug,
      tagline: config.tagline,
      supportEmail: config.supportEmail,
      deploymentTemplate: config.deploymentTemplate,
      tone: config.tone,
      colors: {
        primary: config.primaryColor,
        secondary: config.secondaryColor,
        accent: config.accentColor,
        background: config.backgroundColor,
        foreground: config.foregroundColor,
      },
      domain: {
        production: `https://${config.domain}`,
      },
      generatedAt: new Date().toISOString(),
    };

    const files = [
      {
        id: "manifest",
        title: "Brand Manifest",
        filename: `${slug}.brand.json`,
        content: `${JSON.stringify(manifest, null, 2)}\n`,
        mime: "application/json",
      },
      {
        id: "theme",
        title: "Theme CSS",
        filename: `${slug}.theme.css`,
        content: `${buildThemeCss(config)}\n`,
        mime: "text/css",
      },
      {
        id: "checklist",
        title: "Launch Checklist",
        filename: `${slug}.launch.md`,
        content: buildChecklist(config),
        mime: "text/markdown",
      },
    ];

    return { slug, files };
  }, [config]);

  const update = <K extends keyof ToolkitConfig>(key: K, value: ToolkitConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const copyContent = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${label} copied`);
      window.setTimeout(() => setNotice(""), 1800);
    } catch {
      setNotice("Copy failed. Please copy manually.");
      window.setTimeout(() => setNotice(""), 2200);
    }
  };

  const downloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/90">Toolkit</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Matt Whitelabeling Toolkit</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/70 sm:text-base">
            Configure brand identity, generate deployment-ready assets, and ship a client-branded Matt instance without handcrafting setup files.
          </p>
        </div>
        {notice ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">
            <CheckCircle2 className="h-4 w-4" />
            {notice}
          </div>
        ) : null}
      </div>

      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setConfig(preset.config)}
            className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 text-left transition hover:border-cyan-300/45 hover:bg-cyan-300/10"
          >
            <p className="text-sm font-semibold text-white">{preset.label}</p>
            <p className="mt-1 text-xs text-white/70">{preset.description}</p>
          </button>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-3xl border border-white/15 bg-[#071124]/70 p-5 backdrop-blur-xl sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Palette className="h-5 w-5 text-cyan-300" />
            Brand Configuration
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-white/80">
              Brand name
              <input value={config.brandName} onChange={(event) => update("brandName", event.target.value)} className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-white" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-white/80">
              Tagline
              <input value={config.tagline} onChange={(event) => update("tagline", event.target.value)} className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-white" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-white/80">
              Domain
              <input value={config.domain} onChange={(event) => update("domain", event.target.value)} className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-white" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-white/80">
              Support email
              <input value={config.supportEmail} onChange={(event) => update("supportEmail", event.target.value)} className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-white" />
            </label>

            <label className="flex flex-col gap-1 text-sm text-white/80">
              Deployment template
              <select value={config.deploymentTemplate} onChange={(event) => update("deploymentTemplate", event.target.value as DeploymentTemplate)} className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-white">
                <option value="assistant">Assistant</option>
                <option value="fleet">Fleet</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-white/80">
              Tone
              <select value={config.tone} onChange={(event) => update("tone", event.target.value as BrandTone)} className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-white">
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="technical">Technical</option>
              </select>
            </label>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <label className="flex flex-col gap-1 text-xs text-white/70">
              Primary
              <input type="color" value={config.primaryColor} onChange={(event) => update("primaryColor", event.target.value)} className="h-10 w-full rounded-lg border border-white/20 bg-transparent" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/70">
              Secondary
              <input type="color" value={config.secondaryColor} onChange={(event) => update("secondaryColor", event.target.value)} className="h-10 w-full rounded-lg border border-white/20 bg-transparent" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/70">
              Accent
              <input type="color" value={config.accentColor} onChange={(event) => update("accentColor", event.target.value)} className="h-10 w-full rounded-lg border border-white/20 bg-transparent" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/70">
              Background
              <input type="color" value={config.backgroundColor} onChange={(event) => update("backgroundColor", event.target.value)} className="h-10 w-full rounded-lg border border-white/20 bg-transparent" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/70">
              Foreground
              <input type="color" value={config.foregroundColor} onChange={(event) => update("foregroundColor", event.target.value)} className="h-10 w-full rounded-lg border border-white/20 bg-transparent" />
            </label>
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/70">
            Tone profile: <span className="font-medium text-cyan-200">{toneCopy[config.tone]}</span>
          </div>
        </section>

        <section className="rounded-3xl border border-white/15 bg-[#070d1d]/70 p-5 backdrop-blur-xl sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Globe className="h-5 w-5 text-cyan-300" />
            Live Preview + Exports
          </h2>

          <div
            className="mb-5 rounded-2xl border p-5"
            style={{
              borderColor: `${config.accentColor}66`,
              background: `linear-gradient(145deg, ${config.backgroundColor}, ${config.backgroundColor}dd)`,
              color: config.foregroundColor,
            }}
          >
            <p className="text-xs uppercase tracking-[0.14em]" style={{ color: config.accentColor }}>
              {artifacts.slug}.instance
            </p>
            <h3 className="mt-2 text-2xl font-semibold">{config.brandName}</h3>
            <p className="mt-1 text-sm opacity-80">{config.tagline}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border px-3 py-1" style={{ borderColor: `${config.primaryColor}77` }}>Template: {config.deploymentTemplate}</span>
              <span className="rounded-full border px-3 py-1" style={{ borderColor: `${config.secondaryColor}77` }}>Tone: {config.tone}</span>
              <span className="rounded-full border px-3 py-1" style={{ borderColor: `${config.accentColor}77` }}>Domain: {config.domain}</span>
            </div>
            <button
              type="button"
              className="mt-4 rounded-xl px-4 py-2 text-sm font-medium text-white"
              style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.secondaryColor})` }}
            >
              Launch Branded Assistant
            </button>
          </div>

          <div className="space-y-4">
            {artifacts.files.map((file) => (
              <article key={file.id} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{file.title}</p>
                    <p className="text-xs text-white/60">{file.filename}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => copyContent(file.content, file.title)} className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/10">
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                    <button type="button" onClick={() => downloadFile(file.filename, file.content, file.mime)} className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/40 px-2 py-1 text-xs text-cyan-100 hover:bg-cyan-300/15">
                      <Download className="h-3.5 w-3.5" /> Download
                    </button>
                  </div>
                </div>
                <pre className="max-h-36 overflow-auto rounded-lg border border-white/10 bg-black/40 p-2 text-[11px] leading-relaxed text-white/75">
                  <code>{file.content}</code>
                </pre>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-3xl border border-white/15 bg-[#081025]/65 p-5 backdrop-blur-xl sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
          <ShieldCheck className="h-5 w-5 text-cyan-300" />
          Rollout Notes
        </h2>
        <ul className="grid gap-2 text-sm text-white/75 sm:grid-cols-2">
          <li>Use a dedicated API key set per whitelabel tenant.</li>
          <li>Store branding config in version control with environment mapping.</li>
          <li>Run one staging deploy per client before DNS cutover.</li>
          <li>Keep legal pages and support contacts client-specific.</li>
        </ul>
      </section>
    </div>
  );
}
