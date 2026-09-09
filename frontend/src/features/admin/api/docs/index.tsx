import { getApiDocsOptions } from "@/api/@tanstack/react-query.gen";
import { QueryView } from "@/components/ui/feedback";
import { SwaggerDocs } from "@/components/ui/swagger";
import { useAPIQuery } from "@/hooks/query";

export default function APIDocumentationPage() {
  const query = useAPIQuery({
    ...getApiDocsOptions(),
  });

  return (
    <QueryView query={query}>
      {(data) => <SwaggerDocs spec={data as object} />}
    </QueryView>
  );
}
