import { books as shelf } from "@/config/books";
import { withRef } from "@/lib/links";
import type { Book } from "@/lib/snapshot/types";
import { ArrowUpRight } from "./icons";

const fmt = (n: number) => n.toLocaleString("en-US");

const bookLabel = (b: Book) =>
  [b.name, b.priceLabel, b.rating && `★ ${b.rating.avg} (${fmt(b.rating.count)})`].filter(Boolean).join(" · ");

/** Cover art (5:8) in the book face, or a styled title block when the cover URL is empty (never <img src="">). */
function Face({ book, width }: { book: Book; width: number }) {
  if (!book.cover) {
    return (
      <span data-testid="cover-fallback" className="book-face flex size-full flex-col justify-between bg-text! p-[10%] pl-[14%] text-bg">
        <span className={`line-clamp-5 font-semibold leading-tight ${width > 100 ? "text-[17px]" : "text-[8px]"}`}>{book.name}</span>
        <span className={`opacity-70 ${width > 100 ? "text-[11px]" : "text-[6px]"}`}>Solomon Eseme</span>
      </span>
    );
  }
  return (
    <span className="book-face block size-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={book.cover} alt={book.name} width={width} height={Math.round((width * 8) / 5)} loading="lazy" className="size-full object-cover" />
    </span>
  );
}

/** A 5:8 book: optional page-edge strip (10px, skewed) + face with spine shading. */
function Cover({ book, width, pages = false, fluid = false }: { book: Book; width: number; pages?: boolean; fluid?: boolean }) {
  return (
    <span className="relative block aspect-[5/8]" style={fluid ? undefined : { width }}>
      {pages && (
        <span aria-hidden="true" className="book-pages absolute top-[6px] bottom-[4px] left-[calc(100%-2px)] w-[10px] -skew-y-[8deg] rounded-r-[4px]" />
      )}
      <Face book={book} width={width} />
    </span>
  );
}

const btn = "inline-flex h-9 max-w-full items-center gap-1.5 rounded-[10px] pr-3 pl-2.5 text-sm font-medium transition-colors";

/** Reference §10: 160px tilted cover beside a 24px/600 title, two 36px buttons, 14px stats line. */
export function BooksShelf({ books }: { books: Book[] }) {
  if (books.length === 0) return null;
  const downloads = books.reduce((sum, b) => sum + b.downloads, 0);
  const { avg, count } = shelf.rating;
  const [top, ...rest] = [...books].sort((a, b) => b.downloads - a.downloads);
  return (
    <>
      <div className="grid items-center gap-8 sm:grid-cols-[auto_minmax(0,1fr)]">
        <a
          href={withRef(top.url)}
          target="_blank"
          rel="noopener"
          title={bookLabel(top)}
          className="group/book block w-fit justify-self-center [perspective:1800px] sm:order-first"
        >
          <span className="block drop-shadow-[8px_16px_12px_rgb(29_42_29/0.2)] transition-transform duration-[450ms] [transform:rotateY(-13deg)_rotateZ(-2.5deg)] group-hover/book:[transform:rotateY(-8deg)_rotateZ(-1deg)]">
            <Cover book={top} width={160} pages />
          </span>
        </a>
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight">
            I wrote {books.length} {books.length === 1 ? "book" : "books"}
          </h2>
          <p className="mt-2 text-sm text-muted text-pretty">Free and paid guides on backend engineering, from Node.js to Rust.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={withRef(shelf.url)} target="_blank" rel="noopener" className={`${btn} bg-text text-bg hover:bg-text/80`}>
              <ArrowUpRight className="size-4" />
              Browse all books
            </a>
            <a href={withRef(top.url)} target="_blank" rel="noopener" className={`${btn} bg-surface text-text hover:bg-surface/70`}>
              <ArrowUpRight className="size-4 shrink-0" />
              <span className="truncate">Top: {top.name}</span>
            </a>
          </div>
          <p className="mt-3 text-sm text-muted">
            <b className="font-medium text-text tabular-nums">{fmt(downloads)}</b> downloads · ★ {avg} from {count} reviews
          </p>
        </div>
      </div>
      {rest.length > 0 && (
        <ul data-testid="shelf" className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(64px,1fr))]">
          {rest.map((b) => (
            <li key={b.id}>
              <a href={withRef(b.url)} target="_blank" rel="noopener" title={bookLabel(b)} className="block transition-transform hover:-translate-y-0.5">
                <Cover book={b} width={64} fluid />
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
