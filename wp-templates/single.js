import { gql } from "@apollo/client";
import SeoHead from "../components/SeoHead";
import EntryHeader from "../components/EntryHeader";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { SITE_DATA_QUERY } from "../queries/SiteSettingsQuery";
import { HEADER_MENU_QUERY } from "../queries/MenuQueries";
import { useFaustQuery } from "@faustwp/core";

const POST_QUERY = gql`
  query GetPost($databaseId: ID!, $asPreview: Boolean = false) {
    post(id: $databaseId, idType: DATABASE_ID, asPreview: $asPreview) {
      title
      content
      date
      author {
        node {
          name
        }
      }
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

export default function Component(props) {
  // Loading state for previews
  if (props.loading) {
    return <>Loading...</>;
  }

  const contentQuery = useFaustQuery(POST_QUERY) || {};
  const siteDataQuery = useFaustQuery(SITE_DATA_QUERY) || {};
  const headerMenuDataQuery = useFaustQuery(HEADER_MENU_QUERY) || {};

  const siteData = siteDataQuery?.generalSettings || {};
  const menuItems = headerMenuDataQuery?.primaryMenuItems?.nodes || {
    nodes: [],
  };
  const { title: siteTitle, description: siteDescription } = siteData;
  const { title, content, date, author, seo } = contentQuery?.post || {};

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
        <EntryHeader title={title} date={date} author={author?.node?.name} />
        <div dangerouslySetInnerHTML={{ __html: content }} />
        <div>TEST</div>
      </main>

      <Footer />
    </>
  );
}

Component.queries = [
  {
    query: POST_QUERY,
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
