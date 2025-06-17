import { gql } from "@apollo/client";
import SeoHead from "../components/SeoHead";
import EntryHeader from "../components/EntryHeader";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import { useFaustQuery } from "@faustwp/core"; // Add this import

const PAGE_QUERY = gql`
  query GetPage($databaseId: ID!, $asPreview: Boolean = false) {
    page(id: $databaseId, idType: DATABASE_ID, asPreview: $asPreview) {
      title
      content
      seo {
        title
        description
        canonicalUrl
        robots
        openGraph {
          title
          description
          url
          type
          image {
            url
          }
        }
        jsonLd {
          raw
        }
      }
    }
  }
`;

export default function SinglePage(props) {
  if (props.loading) {
    return <>Loading...</>;
  }

  // Use useFaustQuery instead of useQuery
  const contentQuery = useFaustQuery(PAGE_QUERY) || {};
  const siteDataQuery = useFaustQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useFaustQuery(HEADER_MENU_QUERY) || {};

  // Access data directly from the query results (no .data property needed)
  const siteData = siteDataQuery?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.primaryMenuItems?.nodes || [];
  
  const { title: siteTitle, description: siteDescription } = siteData;
  const { title, content, seo } = contentQuery?.page || {};

  return (
    <>
      <SeoHead
        seo={seo}
        fallbackTitle={`${title} - ${siteTitle}`}
        fallbackDescription={siteDescription}
      />
      <Header
        siteTitle={siteTitle}
        siteDescription={siteDescription}
        menuItems={menuItems}
      />
      <main className="container">
        <EntryHeader title={title} />
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </main>
      <Footer />
    </>
  );
}

SinglePage.queries = [
  {
    query: PAGE_QUERY,
    variables: ({ databaseId }, ctx) => ({
      databaseId,
      asPreview: ctx?.asPreview,
    }),
  },
  {
    query: SITE_DATA_QUERY,
  },
  {
    query: HEADER_MENU_QUERY,
  },
];