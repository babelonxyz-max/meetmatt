"use client";

import Script from "next/script";

export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Meet Matt",
    url: "https://meetmatt.xyz",
    logo: "https://meetmatt.xyz/logo.png",
    description: "Deploy your AI agent in 15 minutes. Get a custom AI assistant for $5/day.",
    sameAs: [
      "https://twitter.com/meetmatt",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "matt@meetmatt.xyz",
      contactType: "customer service",
      availableLanguage: ["English"],
    },
  };

  return (
    <Script
      id="organization-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function ProductSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "AI Agent Deployment Service",
    image: "https://meetmatt.xyz/og-image.jpg",
    description: "Get your own AI agent deployed in 15 minutes. Automates emails, scheduling, research, and more.",
    brand: {
      "@type": "Brand",
      name: "Meet Matt",
    },
    offers: {
      "@type": "Offer",
      url: "https://meetmatt.xyz/pricing",
      price: "150.00",
      priceCurrency: "USD",
      priceValidUntil: "2026-12-31",
      availability: "https://schema.org/InStock",
      itemOffered: {
        "@type": "Service",
        name: "AI Agent Setup",
        description: "One-time setup fee for your custom AI agent",
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "127",
    },
  };

  return (
    <Script
      id="product-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function FAQSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is an AI agent?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "An AI agent is a software assistant powered by artificial intelligence that can perform tasks autonomously. Your AI agent can manage emails, schedule meetings, conduct research, create content, and handle various business tasks without constant supervision.",
        },
      },
      {
        "@type": "Question",
        name: "How long does deployment take?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Your AI agent is deployed within 15-30 minutes after payment confirmation. The process is fully automated using Devin AI technology.",
        },
      },
      {
        "@type": "Question",
        name: "What is the pricing?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The pricing is $150 one-time setup fee plus $150/month care plan, which equals $5/day. This includes maintenance, updates, and ongoing support for your AI agent.",
        },
      },
    ],
  };

  return (
    <Script
      id="faq-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function WebsiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Meet Matt",
    url: "https://meetmatt.xyz",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://meetmatt.xyz/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Script
      id="website-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
