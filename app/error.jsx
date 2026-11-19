"use client";

export default function ErrorPage({ reset }) {
  return <main id="main" className="bare-page"><div className="empty-panel"><h1>Aftertone couldn’t load this page</h1><p>Check the server connection and try again.</p><button className="button solid" type="button" onClick={reset}>Try again</button></div></main>;
}
