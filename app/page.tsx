import { Banner } from "@/components/Banner";
import { Bio } from "@/components/Bio";
import { site } from "@/config/site";
import { products } from "@/config/products";
import { readSnapshot } from "@/lib/snapshot/store";
import { splitProducts, orderCompact, buildChartData, visibleSections, productStatus, revenueUpdatedAt } from "@/lib/split";
import { CompactList } from "@/components/CompactList";
import { MbCard } from "@/components/MbCard";
import { ProductCard } from "@/components/ProductCard";
import { RevenueChart } from "@/components/RevenueChart";
import { GithubGraph } from "@/components/GithubGraph";
import { BooksShelf } from "@/components/BooksShelf";
import { LatestList } from "@/components/LatestList";
import { LatestVideo } from "@/components/LatestVideo";
import { SectionHeader } from "@/components/SectionHeader";
import { Sponsor } from "@/components/Sponsor";
import { Subscribe } from "@/components/Subscribe";
import { Footer, SiteNote } from "@/components/Footer";

// Read per request: the snapshot is a small file and must reflect each refresh immediately.
export const dynamic = "force-dynamic";

/**
 * Layout per docs/superpowers/specs/2026-11-12-marclou-design-reference.md:
 * 1280px container (20px gutters); at lg a 17rem | 1fr grid (gap 48), at xl 21rem | 1fr (gap 64);
 * sticky aside; right column 56px top / 96px bottom; top-level sections pt-16, startup sub-blocks mt-12.
 */
export default async function Home() {
  const snapshot = await readSnapshot();
  const revenue = snapshot?.revenue ?? {};
  const solo = products.filter((p) => p.group === "solo");
  const { cards, compact } = splitProducts(solo, revenue);
  const chart = buildChartData(products, revenue);
  const show = visibleSections(snapshot);
  const updatedAt = revenueUpdatedAt(snapshot);
  const newsletter = snapshot?.newsletter ?? [];
  return (
    <>
      <Banner banner={site.banner} />
      <div className="mx-auto max-w-7xl px-5 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[21rem_minmax(0,1fr)] xl:gap-16">
        <aside className="relative isolate pt-8 lg:sticky lg:top-0 lg:self-start lg:py-14">
          <Bio site={site} productCount={products.length} youtubeSubscribers={snapshot?.youtube?.subscribers} />
        </aside>
        <main className="min-w-0 pt-8 pb-24 lg:pt-14">
          <section id="products" aria-label="Products" className="scroll-mt-8">
            <RevenueChart {...chart} />
            <div className="mt-12">
              <SectionHeader title="My products" right={products.length} />
              <ul data-testid="product-cards" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <li>
                  <MbCard mb={site.mb} live={snapshot?.mbStats} />
                </li>
                {cards.map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} revenue={revenue[p.id]} status={productStatus(p.id, snapshot)} />
                  </li>
                ))}
              </ul>
            </div>
            <CompactList products={orderCompact(compact)} revenue={revenue} />
          </section>
          <GithubGraph github={snapshot?.github} />
          <div id="writing" className="grid scroll-mt-8 grid-cols-1 gap-x-6 lg:grid-cols-2">
            <LatestList
              title="Newsletter"
              posts={newsletter}
              allLabel="All issues"
              allUrl={`${site.newsletter.substackUrl}/archive`}
              prepend={<Subscribe newsletter={site.newsletter} className={`lg:hidden ${newsletter.length ? "mb-6" : ""}`} />}
            />
            <LatestList
              title="Blog"
              posts={snapshot?.blog ?? []}
              allLabel="All posts"
              allUrl="https://blog.masteringbackend.com/authors/kaperskyguru"
            />
          </div>
          <LatestVideo latest={snapshot?.youtube?.latest} />
          {show.books && (
            <section id="books" aria-label="Books" className="scroll-mt-8 pt-16">
              <BooksShelf books={snapshot?.books ?? []} />
            </section>
          )}
          <section id="sponsor" aria-label="Sponsor" className="scroll-mt-8 pt-16">
            <Sponsor sponsor={site.sponsor} />
          </section>
          <SiteNote links={site.footerLinks} updatedAt={updatedAt} />
        </main>
      </div>
      <Footer links={site.footerLinks} updatedAt={updatedAt} />
    </>
  );
}
