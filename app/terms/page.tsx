"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Bot, ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md fixed top-0 left-0 right-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
              className="w-8 h-8 rounded bg-gradient-to-br from-[#0ea5e9] to-purple-600 flex items-center justify-center"
            >
              <Bot className="w-4 h-4 text-white" />
            </motion.div>
            <span className="font-mono text-sm tracking-wider">MATT</span>
          </Link>
          <nav className="flex items-center gap-6 text-xs font-mono">
            <Link href="/pricing" className="text-[var(--muted)] hover:text-[#0ea5e9] transition-colors">
              PRICING
            </Link>
            <Link href="/privacy" className="text-[var(--muted)] hover:text-[#0ea5e9] transition-colors">
              PRIVACY
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
              className="inline-flex items-center gap-2 text-[var(--muted)] hover:text-[#0ea5e9] transition-colors mb-8 text-sm font-mono"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK TO SYSTEM
            </Link>

            <h1 className="text-4xl font-bold mb-8">
              Terms of Service
            </h1>

            <div className="prose dark:prose-invert max-w-none">
              <p className="text-[var(--muted)] mb-6">
                Last updated: February 4, 2025
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  1. Acceptance of Terms
                </h2>
                <p className="text-[var(--muted)] mb-4">
                  By accessing and using MATT (&ldquo;Service&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), 
                  you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, 
                  please do not use our Service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  2. Description of Service
                </h2>
                <p className="text-[var(--muted)] mb-4">
                  MATT is an AI-powered platform that creates custom AI agents based on your specifications. 
                  We utilize Devin AI and other third-party services to build, deploy, and maintain these agents. 
                  The Service includes:
                </p>
                <ul className="list-disc pl-6 text-[var(--muted)] space-y-2">
                  <li>AI agent creation and customization</li>
                  <li>Code generation and deployment</li>
                  <li>Hosting and monitoring services</li>
                  <li>API access (depending on your tier)</li>
                  <li>Technical support</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  3. Account Registration
                </h2>
                <p className="text-[var(--muted)] mb-4">
                  To use certain features of the Service, you may need to provide information such as your name 
                  and email address. You agree to:
                </p>
                <ul className="list-disc pl-6 text-[var(--muted)] space-y-2">
                  <li>Provide accurate and complete information</li>
                  <li>Maintain the security of any account credentials</li>
                  <li>Promptly update your information if it changes</li>
                  <li>Accept responsibility for all activities under your account</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  4. Payment Terms
                </h2>
                <p className="text-[var(--muted)] mb-4">
                  We accept cryptocurrency payments through NOWPayments. By making a purchase:
                </p>
                <ul className="list-disc pl-6 text-[var(--muted)] space-y-2">
                  <li>You agree to pay all fees associated with your selected tier</li>
                  <li>All payments are final - we do not offer refunds for custom services once work has begun</li>
                  <li>Prices are subject to change with notice</li>
                  <li>You are responsible for any taxes applicable to your purchase</li>
                </ul>
                <p className="text-[var(--muted)] mt-4">
                  Since we immediately begin working on your custom agent after payment (via Devin AI), 
                  we cannot offer refunds. We will work with you to ensure satisfaction with the delivered product.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  5. Refund Policy
                </h2>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-amber-800 dark:text-amber-200 font-medium mb-2">
                    No Refunds Policy
                  </p>
                  <p className="text-[var(--muted)] text-sm">
                    MATT provides custom AI agent development services that begin immediately upon payment. 
                    Due to the nature of custom software development and third-party orchestration costs 
                    (Devin AI, infrastructure), <strong>all sales are final</strong> and we do not offer refunds.
                  </p>
                  <p className="text-[var(--muted)] text-sm mt-2">
                    If you experience issues with your delivered agent, contact us at{" "}
                    <a href="mailto:matt@meetmatt.xyz" className="text-blue-600 dark:text-blue-400 hover:underline">
                      matt@meetmatt.xyz
                    </a>{" "}
                    and we will work to resolve any problems.
                  </p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  6. Intellectual Property
                </h2>
                <p className="text-[var(--muted)] mb-4">
                  Upon successful payment and delivery:
                </p>
                <ul className="list-disc pl-6 text-[var(--muted)] space-y-2">
                  <li>You own the code and assets generated for your AI agent</li>
                  <li>You may modify, distribute, or deploy the code as you see fit</li>
                  <li>We retain ownership of our platform, tools, and methodology</li>
                  <li>You may not resell our service or claim it as your own technology</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  7. Acceptable Use
                </h2>
                <p className="text-[var(--muted)] mb-4">
                  You agree not to use the Service to create agents that:
                </p>
                <ul className="list-disc pl-6 text-[var(--muted)] space-y-2">
                  <li>Violate any laws or regulations</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Generate harmful, abusive, or discriminatory content</li>
                  <li>Engage in spam, phishing, or malicious activities</li>
                  <li>Process personal data without proper consent</li>
                  <li>Attempt to harm our systems or other users</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  8. Service Limitations
                </h2>
                <p className="text-[var(--muted)] mb-4">
                  We strive to provide reliable service, but we do not guarantee:
                </p>
                <ul className="list-disc pl-6 text-[var(--muted)] space-y-2">
                  <li>Uninterrupted or error-free service</li>
                  <li>Specific results or performance metrics</li>
                  <li>Compatibility with all third-party systems</li>
                  <li>Preservation of data beyond stated retention periods</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  9. Third-Party Services
                </h2>
                <p className="text-[var(--muted)] mb-4">
                  Our Service integrates with third-party providers including Devin AI and NOWPayments. 
                  Your use of these services is subject to their respective terms and policies. 
                  We are not responsible for third-party service availability or performance.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  10. Termination
                </h2>
                <p className="text-[var(--muted)] mb-4">
                  We may suspend or terminate your access if you violate these terms. 
                  Upon termination, your agents will remain operational for the duration of your monitoring period, 
                  after which hosting services may be discontinued unless otherwise arranged.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  11. Limitation of Liability
                </h2>
                <p className="text-[var(--muted)] mb-4">
                  To the maximum extent permitted by law, we shall not be liable for any indirect, 
                  incidental, special, consequential, or punitive damages arising from your use of the Service. 
                  Our total liability shall not exceed the amount you paid for the Service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  12. Changes to Terms
                </h2>
                <p className="text-[var(--muted)] mb-4">
                  We may update these Terms from time to time. We will notify you of significant changes 
                  by posting the new Terms on this page and updating the &ldquo;Last updated&rdquo; date. 
                  Your continued use of the Service after changes constitutes acceptance.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
                  13. Contact
                </h2>
                <p className="text-[var(--muted)]">
                  For questions about these Terms, please contact us at:{' '}
                  <a 
                    href="mailto:legal@meetmatt.xyz" 
                    className="text-blue-600 dark:text-blue-400 hover:underline"
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
            <p className="text-sm text-[var(--muted)] dark:text-slate-400">
              © 2025 MATT. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/terms" className="text-sm text-[var(--foreground)] font-medium">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-sm text-[var(--muted)] dark:text-slate-400 hover:text-[#0ea5e9] transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
