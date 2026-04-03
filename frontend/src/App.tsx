import { Provider } from "@/components/ui/provider";
import { QueryClientProvider } from "@tanstack/react-query";
import { useShallow } from "zustand/shallow";
import "./App.css";
import { Toaster } from "./components/ui/toaster/message";
import { queryClient } from "./config/query";
import { Router } from "./routes";
import { useGlobalStore } from "./store";

function App() {
  const primaryColor = useGlobalStore(
    useShallow((state) => state.primaryColor),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <Provider primaryColor={primaryColor}>
        <Router />
        <Toaster />
      </Provider>
    </QueryClientProvider>
  );
}

export default App;
