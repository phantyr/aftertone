import { SavedCatalog } from "../../../components/saved";

export const metadata = { title: "Saved releases" };

export default function SavedPage() {
  return <main id="main" className="public-main page"><header className="page-heading"><h1>Saved releases</h1><p>Your collection on this device.</p></header><SavedCatalog/></main>;
}
