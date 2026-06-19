import SwaggerUI from "swagger-ui-react";

import "swagger-ui-react/swagger-ui.css";
import "./swagger-ui-dark.css";

// Swap with Scalar?
// https://www.npmjs.com/package/@scalar/api-reference

export function SwaggerDocs({ spec }: { spec: object | string }) {
  return <SwaggerUI spec={spec} />;
}
