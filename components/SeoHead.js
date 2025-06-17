import Head from "next/head";

export default function SeoHead({ seo, fallbackTitle = "", fallbackDescription = "" }) {
  const {
    title,
    description,
    canonicalUrl,
    robots,
    openGraph,
    jsonLd,
  } = seo || {};

  const ogImage = openGraph?.image?.url;

  return (
    <Head>
      <title>{title || fallbackTitle}</title>

      {description && <meta name="description" content={description} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {robots && <meta name="robots" content={robots} />}

      {/* Open Graph */}
      {openGraph?.title && <meta property="og:title" content={openGraph.title} />}
      {openGraph?.description && (
        <meta property="og:description" content={openGraph.description} />
      )}
      {openGraph?.type && <meta property="og:type" content={openGraph.type} />}
      {openGraph?.url && <meta property="og:url" content={openGraph.url} />}
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      {openGraph?.title && <meta name="twitter:title" content={openGraph.title} />}
      {openGraph?.description && (
        <meta name="twitter:description" content={openGraph.description} />
      )}
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {/* JSON-LD */}
      {jsonLd?.raw && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd.raw }}
        />
      )}
    </Head>
  );
}