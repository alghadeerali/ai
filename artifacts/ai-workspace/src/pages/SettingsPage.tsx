import { useSettings } from "@/providers/SettingsProvider";
import { useTheme } from "next-themes";
import { Settings, Moon, Sun, Monitor, AlignLeft, AlignRight, Key } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { direction, setDirection, openRouterKeyConfigured } = useSettings();

  return (
    <div className="flex-1 p-8 bg-background overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">Manage app preferences and configurations.</p>
        </div>

        <div className="grid gap-6">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Appearance</CardTitle>
              <CardDescription>Customize how AI Workspace looks on your device.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">Theme</Label>
                <RadioGroup 
                  defaultValue={theme || "dark"} 
                  onValueChange={setTheme}
                  className="grid grid-cols-3 gap-4"
                >
                  <Label
                    htmlFor="theme-light"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 cursor-pointer"
                  >
                    <RadioGroupItem value="light" id="theme-light" className="sr-only" />
                    <Sun className="mb-3 h-6 w-6" />
                    Light
                  </Label>
                  <Label
                    htmlFor="theme-dark"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 cursor-pointer"
                  >
                    <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
                    <Moon className="mb-3 h-6 w-6" />
                    Dark
                  </Label>
                  <Label
                    htmlFor="theme-system"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 cursor-pointer"
                  >
                    <RadioGroupItem value="system" id="theme-system" className="sr-only" />
                    <Monitor className="mb-3 h-6 w-6" />
                    System
                  </Label>
                </RadioGroup>
              </div>

              <Separator className="bg-border" />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Text Direction</Label>
                <CardDescription className="mb-3">
                  Force the chat interface to Left-to-Right or Right-to-Left (useful for Arabic).
                </CardDescription>
                <RadioGroup 
                  defaultValue={direction} 
                  onValueChange={(val: any) => setDirection(val)}
                  className="grid grid-cols-3 gap-4"
                >
                  <Label
                    htmlFor="dir-auto"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 cursor-pointer"
                  >
                    <RadioGroupItem value="auto" id="dir-auto" className="sr-only" />
                    <Monitor className="mb-3 h-6 w-6" />
                    Auto Detect
                  </Label>
                  <Label
                    htmlFor="dir-ltr"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 cursor-pointer"
                  >
                    <RadioGroupItem value="ltr" id="dir-ltr" className="sr-only" />
                    <AlignLeft className="mb-3 h-6 w-6" />
                    LTR
                  </Label>
                  <Label
                    htmlFor="dir-rtl"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 cursor-pointer"
                  >
                    <RadioGroupItem value="rtl" id="dir-rtl" className="sr-only" />
                    <AlignRight className="mb-3 h-6 w-6" />
                    RTL
                  </Label>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Integrations</CardTitle>
              <CardDescription>API Keys and external services.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Key className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium">OpenRouter API Key</h4>
                    <p className="text-sm text-muted-foreground">Used for routing AI requests</p>
                  </div>
                </div>
                <div>
                  {openRouterKeyConfigured ? (
                    <div className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-xs font-medium flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      Configured
                    </div>
                  ) : (
                    <div className="px-3 py-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-full text-xs font-medium flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-destructive"></div>
                      Missing
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                API keys are managed securely on the backend via environment variables. Contact your administrator to update them.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
