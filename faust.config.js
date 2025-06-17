import { setConfig } from "@faustwp/core";
import templates from "./wp-templates";
import possibleTypes from "./possibleTypes.json";

/**
 * @type {import('@faustwp/core').FaustConfig}
 **/
export default setConfig({
  wpUrl: process.env.NEXT_PUBLIC_WORDPRESS_URL,
  apiClientSecret: process.env.FAUST_SECRET_KEY,
  templates,
  experimentalPlugins: [],
  possibleTypes,
});