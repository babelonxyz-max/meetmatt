"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Bot, ArrowLeft, Shield, Lock, Eye, Trash2 } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
              className="w-8 h-8 rounded bg-gradient-to-br from-[#0ea5e9] to-purple-600 flex items-center justify-center"
            >
              <Bot className="w-5 h-5 text-white" />
            </motion.div>
            <span className="font-bold text-xl text-[var(--foreground)]">MATT</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/pricing" className="text-[var(--muted)] hover:text-[#0ea5e9] transition-colors">
              Pricing
            </Link>
            <Link href="/terms" className="text-[var(--muted)] hover:text-[#0ea5e9] transition-colors">
              Terms
            </Link>
          </nav>
        </div>
      </header>

      <main className="pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-[var(--muted)] hover:text-[#0ea5e9] transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK TO SYSTEM
            </Link>

            <div className="flex items-center gap-3 mb-8">
              <Shield className="w-10 h-10 text-[#0ea5e9]" />
              <h1 className="text-4xl font-bold text-[var(--foreground)]">
                Privacy Policy
              </h1>
            </div>

            <div className="prose dark:prose-invert max-w-none">
              <p className="text-[var(--muted)] mb-8">
                Last updated: February 4, 2025
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
                <p className="text-[var(--foreground)] m-0">
                  At MATT, we take your privacy seriously. This policy explains how we collect, 
                  use, and protect your personal information when you use our Service.
                </p>
              </div>

              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="w-5 h-5 text-[#0ea5e9]" />
                  <h2 className="text-2xl font-semibold text-[var(--foreground)] m-0">
                    Information We Collect
                  </h2>
                </div>
                
                <h3 className="text-lg font-medium text-[var(--foreground)] mt-6 mb-3">
                  Personal Information
                </h3>
                <ul className="list-disc pl-6 text-[var(--muted)] space-y-2">
                  <li><strong>Name:</strong> Used for personalization and communication</li>
                  <li><strong>Email address:</strong> Used for notifications and support</li>
                  <li><strong>Payment information:</strong> Cryptocurrency wallet addresses (processed by NOWPayments)</li>
                </ul>

                <h3 className="text-lg font-medium text-[var(--foreground)] mt-6 mb-3">
                  Agent Configuration Data
                </h3>
                <ul className="list-disc pl-6 text-[var(--muted)] space-y-2">
                  <li>Agent names and descriptions</li>
                  <li>Feature specifications</li>
                  <li>Purpose and use-case details</li>
                  <li>Generated code and assets</li>
                </ul>

                <h3 className="text-lg font-medium text-[var(--foreground)] mt-6 mb-3">
                  Technical Data
                </h3>
                <ul className="list-disc pl-6 text-[var(--muted)] space-y-2">
                  <li>IP address and browser information</li>
                  <li>Device and operating system details</li>
                  <li>Usage patterns and interaction data</li>
                  <li>Cookies and local storage data</li>
                </ul>
              </section>

              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5 text-[#0ea5e9]" />
                  <h2 className="text-2xl font-semibold text-[var(--foreground)] m-0">
                    How We Use Your Information
                  </h2>
                </div>
                <ul className="list-disc pl-6 text-[var(--muted)] space-y-2">
                  <li>To create and deploy your AI agents</li>
                  <li>To communicate about your orders and provide support</li>
                  <li>To process payments and prevent fraud</li>
                  <li>To improve our Service and develop new features</li>
                  <li>To send important updates and marketing communications (with your consent)</li>
                  <li>To comply with legal obligations</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  Information Sharing
                </h2>
                <p className="text-[var(--muted)] mb-4">
                  We do not sell your personal information. We may share data with:
                </p>
                <ul className="list-disc pl-6 text-[var(--muted)] space-y-2">
                  <li><strong>Devin AI:</strong> To build your agents (session data only)</li>
                  <li><strong>NOWPayments:</strong> To process cryptocurrency payments</li>
                  <li><strong>Hosting providers:</strong> To deploy and run your agents</li>
                  <li><strong>Analytics services:</strong> To understand Service usage (anonymized)</li>
                  <li><strong>Legal authorities:</strong> When required by law</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  Data Security
                </h2>
                <p className="text-[var(--muted)] mb-4">
                  We implement appropriate technical and organizational measures to protect your data:
                </p>
                <ul className="list-disc pl-6 text-[var(--muted)] space-y-2">
                  <li>Encryption in transit (TLS) and at rest</li>
                  <li>Secure database access controls</li>
                  <li>Regular security audits</li>
                  <li>Limited employee access to personal data</li>
                  <li>Incident response procedures</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  Data Retention
                </h2>
                <p className="text-[var(--muted)] mb-4">
                  We retain your information for as long as necessary to:
                </p>
                <ul className="list-disc pl-6 text-[var(--muted)] space-y-2">
                  <li>Provide our Service (duration of monitoring period)</li>
                  <li>Comply with legal obligations (typically 7 years for financial records)</li>
                  <li>Resolve disputes and enforce agreements</li>
                  <li>Maintain business records</li>
                </ul>
                <p className="text-[var(--muted)] mt-4">
                  You may request deletion of your data at any time by contacting us.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  Your Rights
                </h2>
                <p className="text-[var(--muted)] mb-4">
                  Depending on your location, you may have the right to:
                </p>
                <ul className="list-disc pl-6 text-[var(--muted)] space-y-2">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Object to certain processing</li>
                  <li>Request data portability</li>
                  <li>Withdraw consent</li>
                  <li>Lodge a complaint with a supervisory authority</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  Cookies and Tracking
                </h2>
                <p className="text-[var(--muted)] mb-4">
                  We use cookies and similar technologies to:
                </p>
                <ul className="list-disc pl-6 text-[var(--muted)] space-y-2">
                  <li>Maintain your session and preferences</li>
                  <li>Understand how you use our Service</li>
                  <li>Remember your theme preference (dark/light mode)</li>
                </ul>
                <p className="text-[var(--muted)] mt-4">
                  You can control cookies through your browser settings. Note that disabling cookies 
                  may affect Service functionality.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  International Transfers
                </h2>
                <p className="text-[var(--muted)] mb-4">
                  Your data may be transferred to and processed in countries other than your own, 
                  including the United States. We ensure appropriate safeguards are in place for such transfers.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  Children&apos;s Privacy
                </h2>
                <p className="text-[var(--muted)] mb-4">
                  Our Service is not intended for children under 13. We do not knowingly collect 
                  personal information from children. If you believe we have collected information 
                  from a child, please contact us immediately.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  Changes to This Policy
                </h2>
                <p className="text-[var(--muted)] mb-4">
                  We may update this Privacy Policy from time to time. We will notify you of significant 
                  changes by posting the new policy on this page and updating the &ldquo;Last updated&rdquo; date. 
                  We encourage you to review this policy periodically.
                </p>
              </section>

              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Trash2 className="w-5 h-5 text-[#0ea5e9]" />
                  <h2 className="text-2xl font-semibold text-[var(--foreground)] m-0">
                    Data Deletion
                  </h2>
                </div>
                <p className="text-[var(--muted)] mb-4">
                  To request deletion of your data, please email us at{' '}
                  <a 
                    href="mailto:legal@meetmatt.xyz" 
                    className="text-[#0ea5e9] hover:underline"
                  >
                    legal@meetmatt.xyz
                  </a>{' '}
                  with the subject line &ldquo;Data Deletion Request.&rdquo; We will process your request 
                  within 30 days and confirm completion via email.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  Contact Us
                </h2>
                <p className="text-[var(--muted)]">
                  For privacy-related questions or concerns, please contact us at:{' '}
                  <a 
                    href="mailto:legal@meetmatt.xyz" 
                    className="text-[#0ea5e9] hover:underline"
                  >
                    legal@meetmatt.xyz
                  </a>
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-[var(--muted)]">
              © 2025 MATT. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/terms" className="text-sm text-[var(--muted)] hover:text-[#0ea5e9] transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-sm text-[var(--foreground)] font-medium">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
