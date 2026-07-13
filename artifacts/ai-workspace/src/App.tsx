import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ThemeProvider } from 'next-themes';

import MainLayout from '@/components/layout/MainLayout';
import ChatPage from '@/pages/ChatPage';
import UsagePage from '@/pages/UsagePage';
import PersonasPage from '@/pages/PersonasPage';
import ArchivePage from '@/pages/ArchivePage';
import SettingsPage from '@/pages/SettingsPage';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function Router() {
  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={ChatPage} />
        <Route path="/c/:id" component={ChatPage} />
        <Route path="/usage" component={UsagePage} />
        <Route path="/personas" component={PersonasPage} />
        <Route path="/archive" component={ArchivePage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
