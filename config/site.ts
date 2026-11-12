import type { Site } from "./schema";

export const site: Site = {
  newsletter: {
    name: "Backend Weekly",
    substackUrl: "https://kaperskyguru.substack.com",
    subscribers: 13000,
    asOf: "2026-11-12",
  },
  socials: {
    x: { handle: "kaperskyguru", followers: 37700 },
    linkedin: { url: "https://linkedin.com/in/solomoneseme", followers: 14200 },
    youtube: { channelHandle: "@solomoneseme" },
    email: "solomon@masteringbackend.com",
  },
  github: { username: "kaperskyguru" },
  mb: {
    // founded + team confirmed by Solomon (2026-11-12). learners is fallbacks only: the card
    // prefers live values from snapshot.mbStats (academy GET /public/stats); 0 renders as "—".
    learners: 0,
    founded: 2020,
    team: 5,
  },
  sponsor: {
    asOf: "2026-11-12",
    bookingUrl: "https://www.passionfroot.me/solomon-eseme",
    channels: [
      {
        name: "Backend Weekly",
        stats: [
          { label: "Subscribers", value: "13K" },
          { label: "Open rate", value: "35%" },
          { label: "CTR", value: "5%" },
        ],
        offers: [
          { name: "Top ad", price: "$500" },
          { name: "3-issue bundle", price: "$1,200" },
          { name: "Classified", price: "$300" },
        ],
      },
      {
        name: "X @Kaperskyguru",
        stats: [
          { label: "Followers", value: "37.7K" },
          { label: "Impressions", value: "1.6M" },
        ],
        offers: [
          { name: "Tweet", price: "$200" },
          { name: "Thread", price: "$500" },
        ],
      },
      {
        name: "LinkedIn",
        stats: [
          { label: "Followers", value: "14.2K" },
          { label: "Impressions/post", value: "5.9K" },
        ],
        offers: [
          { name: "Post", price: "$200" },
          { name: "2-post bundle", price: "$325" },
        ],
      },
    ],
    partners: ["Treblle", "Larafast", "Bright Data", "Blackbox.ai", "Remix"],
  },
  banner: {
    enabled: false,
    text: "Land Your Dream Coding Job in 90 Days by shipping 30 projects in 30 days with our exclusive challenge.",
    cta: "Join now for just $54",
    url: "https://python30.masteringbackend.com",
  },
  footerLinks: [
    { label: "Blog", url: "https://blog.masteringbackend.com/authors/kaperskyguru" },
    { label: "YouTube", url: "https://www.youtube.com/@solomoneseme" },
    { label: "Medium", url: "https://medium.com/@kaperskyguru" },
    { label: "Dev.to", url: "https://dev.to/kaperskyguru" },
    { label: "Backend FM", url: "https://backendweekly.dev/podcasts/" },
    { label: "Publication", url: "https://publication.masteringbackend.com" },
  ],
};
