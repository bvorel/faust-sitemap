import { gql } from "@apollo/client";

export const PAGE_QUERY = gql`
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