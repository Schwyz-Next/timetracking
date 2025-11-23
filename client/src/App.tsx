import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import TimeEntries from "./pages/TimeEntries";
import Settings from "./pages/Settings";
import Invoices from "./pages/Invoices";
import Users from "./pages/Users";
import AuditLogs from "./pages/AuditLogs";
import Login from "./pages/Login";
import OdooSettings from "./pages/OdooSettings";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path={"/"} component={Dashboard} />
      <Route path="/projects" component={Projects} />
      <Route path="/time-entries" component={TimeEntries} />
      <Route path="/settings" component={Settings} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/users" component={Users} />
      <Route path="/audit-logs" component={AuditLogs} />
      <Route path="/odoo-settings" component={OdooSettings} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
