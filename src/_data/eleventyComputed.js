import { metadataFor } from "../../scripts/site-metadata.mjs";

export default {
  metadata: (data) => metadataFor(data, data.site),
};
