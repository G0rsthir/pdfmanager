import { getAppStateOptions } from "@/api/@tanstack/react-query.gen";
import { ApplicationError } from "@/components/ui/error";
import { useAPIQuery } from "@/hooks/query";
import { Center, Skeleton } from "@chakra-ui/react";
import { Navigate } from "react-router";
import { SetupUser } from "./user";

/**
 * Page for the initial application setup.
 */
export default function SetupPage() {
  const { isLoading, isError, data, refetch } = useAPIQuery({
    ...getAppStateOptions(),
  });

  if (isLoading)
    return (
      <Center h="100vh">
        <Skeleton height="30rem" maxWidth="23rem" />
      </Center>
    );
  if (isError)
    return <ApplicationError description="Failed to load setup state" />;

  const setupStepCallback = () => {
    refetch();
  };

  switch (true) {
    case data?.is_initial_user_created !== true:
      return <SetupUser progress={30} successCallback={setupStepCallback} />;
    case data?.is_setup_complete === true:
      return <Navigate to="/" />;
    default:
      return (
        <ApplicationError description="Invalid setup state - The current setup state doesn't match any of the available options." />
      );
  }
}
