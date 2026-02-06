"use client";

import { motion } from "framer-motion";
import { Shield, Lock, Eye, Database, Trash2, Mail } from "lucide-react";

const sections = [
  {
    icon: Database,
    title: "Information We Collect",
    content: `We collect minimal information necessary to provide our services:

• **Authentication Data**: When you log in via Privy, we receive your wallet address or email to identify your account.
• **Agent Configuration**: The settings and preferences you provide when creating AI agents (agent name, use case, capabilities).
• **Payment Information**: Payment processing is handled by third-party providers. We store only transaction references, not payment details.
• **Usage Data**: Anonymous analytics to improve our service (page views, feature usage).`
  },
  {
    icon: Eye,
    title: "How We Use Your Data",
    content: `Your data is used exclusively for:

• **Service Delivery**: Creating and managing your AI agents according to your specifications.
• **Authentication**: Verifying your identity and securing your account.
• **Communication**: Sending important updates about your agents or service changes.
• **Improvement**: Analyzing usage patterns to enhance our platform (anonymized data only).`
  },
  {
    icon: Shield,
    title: "Data Protection",
    content: `We implement industry-standard security measures:

• **Encryption**: All data is encrypted in transit (TLS 1.3) and at rest (AES-256).
• **Access Control**: Strict authentication and authorization protocols.
• **Regular Audits**: Security assessments and penetration testing.
• **No Data Selling**: We never sell, rent, or trade your personal information to third parties.`
  },
  {
    icon: Lock,
    title: "Third-Party Services",
    content: `We use trusted third-party services for specific functions:

• **Privy**: Authentication and wallet connection.
• **Vercel**: Hosting and infrastructure.
• **Neon**: Database hosting.
• **Telegram**: Bot delivery and messaging.

Each provider is vetted for security and privacy compliance. They only receive data necessary for their specific function.`
  },
  {
    icon: Trash2,
    title: "Data Retention & Deletion",
    content: `You control your data:

• **Retention**: We keep data only as long as necessary to provide our services or as required by law.
• **Deletion**: You can request complete deletion of your account and associated data at any time.
• **Agent Data**: When you delete an agent, all associated configuration data is permanently removed within 30 days.
• **Backups**: Encrypted backups are retained for 90 days for disaster recovery purposes only.`
  },
  {
    icon: Mail,
    title: "Contact Us",
    content: `For privacy-related questions or requests:

• **Email**: privacy@meetmatt.xyz
• **Response Time**: We respond to all privacy inquiries within 48 hours.
• **Data Requests**: You can request a copy of your data or deletion at any time.`
  }
];

export default function PrivacyPage() {
  return (
    <div className="pt-14 pb-12 overflow-x-hidden">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
            <Shield className="w-8 h-8 text-[var(--accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-[var(--muted)] text-lg">Last updated: February 2025</p>
        </motion.div>

        {/* Intro */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 mb-8"
        >
          <p className="text-[var(--muted)] leading-relaxed">
            At Matt AI, we take your privacy seriously. This policy describes how we collect, use, and protect your personal information. We believe in data minimization — we only collect what&apos;s necessary to provide our services, and we never sell your data to third parties.
          </p>
        </motion.div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                  <section.icon className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <h2 className="text-xl font-semibold">{section.title}</h2>
              </div>
              <div className="text-[var(--muted)] leading-relaxed whitespace-pre-line text-sm">
                {section.content}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center text-sm text-[var(--muted)]"
        >
          <p>This privacy policy is subject to change. We will notify users of any significant changes via email or in-app notification.</p>
        </motion.div>
      </div>
    </div>
  );
}
