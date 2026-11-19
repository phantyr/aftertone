import Link from "next/link";
import { Disc3, Pencil } from "lucide-react";

export function Status({ value }) {
  return <span className={`status-pill ${value}`}>{value}</span>;
}

const dateAndTime = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

export function ReleaseTable({ rows }) {
  if (!rows.length) return <div className="studio-empty"><Disc3 size={27}/><p>No matching releases.</p></div>;
  return <div className="table-scroll"><table className="studio-table">
    <thead><tr><th>Release</th><th>Status</th><th>Tracks</th><th>Downloads</th><th>Updated (UTC)</th><th><span className="sr-only">Actions</span></th></tr></thead>
    <tbody>{rows.map((row) => <tr key={row.id}>
      <td><div className="table-release"><div className="table-cover">{row.cover_id ? <img src={`/api/media/${row.cover_id}`} width="40" height="40" alt=""/> : <Disc3 size={18}/>}</div>
        <div><Link href={`/studio/releases/${row.id}`}>{row.title}</Link><small>{row.artist} · {row.genre}{row.demo ? " · Demo" : ""}</small></div></div></td>
      <td><Status value={row.status}/></td><td>{row.track_count}</td><td>{Number(row.downloads).toLocaleString()}</td>
      <td><time dateTime={row.updated_at.toISOString()}>{dateAndTime.format(row.updated_at)}</time></td>
      <td><Link className="icon-button" href={`/studio/releases/${row.id}`} aria-label={`Edit ${row.title}`}><Pencil size={16}/></Link></td>
    </tr>)}</tbody>
  </table></div>;
}

export function ActivityTable({ rows }) {
  if (!rows.length) return <div className="studio-empty"><p>No activity recorded yet.</p></div>;
  return <div className="table-scroll"><table className="studio-table">
    <thead><tr><th>Action</th><th>Item</th><th>Staff member</th><th>Time (UTC)</th></tr></thead>
    <tbody>{rows.map((row) => <tr key={row.id}><td>{row.action}</td><td><strong>{row.target_name}</strong></td><td>{row.actor}</td>
      <td><time dateTime={row.created_at.toISOString()}>{dateAndTime.format(row.created_at)}</time></td></tr>)}</tbody>
  </table></div>;
}
