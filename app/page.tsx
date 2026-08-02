import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <h1>Warm-Intro Graph</h1>
      <p className="subtitle">
        Buying-group mapping and warm-intro path-finding over the who-do-we-know graph.
      </p>
      <nav className="nav-links">
        <Link href="/buying-group">Buying group lookup &rarr;</Link>
        <Link href="/warm-intro">Warm-intro path finder &rarr;</Link>
      </nav>
    </main>
  );
}
