import Script from "next/script";

export function PublicAnalytics() {
  return (
    <Script
      src="https://jay-cloud.vercel.app/script.js"
      data-website-id="f52a832a-723d-4d1f-9268-e8415f723a2b"
      data-domains="research.jdranpariya.com"
      data-exclude-search="true"
      data-exclude-hash="true"
      strategy="afterInteractive"
    />
  );
}
