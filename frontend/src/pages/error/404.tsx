import { UnrecoverableError } from "@/components/ui/error";

export function Error404Page() {
  return (
    <UnrecoverableError
      errorCode="404 Not Found"
      title="We are sorry, but the page you are looking for was not found"
    />
  );
}
