import type { Product } from "./schema";

// Only MasteringBackend is group "mb" (company: no amount, never fetched/charted/summed).
// Backend Projects / Weekly / Jobs are untracked solo listings ($0/mo, no sources) kept first in the compact list.
export const products: Product[] = [
  { id: "masteringbackend", name: "MasteringBackend", url: "https://masteringbackend.com", icon: "/img/products/masteringbackend.png", tagline: "Helping you become a great backend engineer and unlock your career.", group: "mb", sources: [] },
  { id: "backendprojects", name: "Backend Projects", url: "https://backendprojects.dev", tagline: "Build Real-World Backend Projects & Land Your Dream Backend Job", group: "solo", sources: [] },
  { id: "backendweekly", name: "Backend Weekly", url: "https://backendweekly.dev", tagline: "Improve Your Backend Engineering Skills one newsletter at a time.", group: "solo", sources: [] },
  { id: "getbackendjobs", name: "Get Backend Jobs", url: "https://getbackendjobs.com", tagline: "Find tailored backend engineering jobs or Hire top backend engineers.", group: "solo", sources: [] },
  { id: "profaily", name: "Profaily", url: "https://profaily.com", icon: "/img/products/profaily.png", tagline: "Typefully for video", group: "solo", sources: [] },
  {
    id: "boilerplatesearch",
    name: "BoilerplateSearch",
    url: "https://boilerplatesearch.com",
    icon: "/img/products/boilerplatesearch.png",
    tagline: "A directory of Boilerplates and Boilerplate marketplace",
    group: "solo",
    revenueModel: "one-off",
    sources: [{ provider: "lemonsqueezy", storeId: "82309", productIds: ["257073", "654164", "1213591"] }],
  },
  { id: "contentre", name: "Contentre", url: "https://contentre.io", tagline: "Become a Certified Technical Writer", group: "solo", sources: [], badge: { kind: "archived", label: "Archived" } },
  { id: "enterprisevue", name: "Enterprise Vue", url: "https://enterprisevue.dev", tagline: "Learn to build and deliver enterprise-ready Vue and JavaScript applications.", group: "solo", sources: [] },
  { id: "codeplayground", name: "Codeplayground", url: "https://codeplayground.site", tagline: "Online Code Playground for Backend Engineers.", group: "solo", sources: [] },
  { id: "codeprenuers", name: "Codeprenuers", url: "https://codeprenuers.dev", tagline: "Turn your coding skills into Income.", group: "solo", sources: [] },
  { id: "nuxifysaas", name: "NuxifySaaS", url: "https://nuxifysaas.com", tagline: "Launch your startup in days with Nuxt.", group: "solo", sources: [], badge: { kind: "archived", label: "Archived" } },
  { id: "techpad", name: "Techpad", url: "https://techpad.ink", tagline: "Create and Publish Content at scale for SaaS Creators.", group: "solo", sources: [] },
  { id: "aifordevelopers", name: "AI for Developers", url: "https://aifordevelopers.dev", tagline: "AI education for Software Engineers.", group: "solo", sources: [] },
  { id: "backendjoy", name: "Backend Joy", url: "https://backendjoy.com", tagline: "Build your Backend MVP in 14 days.", group: "solo", sources: [] },
  {
    // DRAFT one-liner and URL (from the masteringai repo), for Solomon to confirm.
    id: "masteringai",
    name: "MasteringAI",
    url: "https://masteringai.dev",
    icon: "/img/products/masteringai.png",
    tagline: "Learn to build with AI, from first prompt to shipped product.",
    group: "solo",
    revenueModel: "one-off",
    sources: [
      {
        provider: "asyncpay",
        account: "mb_shared",
        filter: { field: "meta_data.source", values: ["scholarship_page", "ai_automation_scholarship"] },
      },
    ],
  },
  {
    // DRAFT one-liner; URL (affizy.app) from the Affizy repo, for Solomon to confirm.
    id: "affizy",
    name: "Affizy",
    url: "https://affizy.app",
    icon: "/img/products/affizy.png",
    tagline: "Run an affiliate program for your SaaS without the spreadsheets.",
    group: "solo",
    sources: [],
  },
];
