import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/app/app";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@/styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Toaster>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </Toaster>
  </React.StrictMode>,
);
