import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ page, pages, href }) {
  if (pages <= 1) return null;
  return <nav className="pagination" aria-label="Pages">
    {page > 1 ? <Link className="button outline" href={href(page - 1)}><ChevronLeft size={16}/>Previous</Link> : <span/>}
    <span>Page {page} of {pages}</span>
    {page < pages ? <Link className="button outline" href={href(page + 1)}>Next<ChevronRight size={16}/></Link> : <span/>}
  </nav>;
}
