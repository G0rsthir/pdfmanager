import { Provider } from "@/components/ui/provider";
import { QueryClientProvider } from "@tanstack/react-query";
import "./App.css";
import { Toaster } from "./components/ui/toaster/message";
import { queryClient } from "./config/query";
import { Router } from "./routes";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider>
        <Router />
        <Toaster />
      </Provider>
    </QueryClientProvider>
  );
}

export default App;
