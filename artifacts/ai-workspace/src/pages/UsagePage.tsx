import { 
  useGetUsageStats, 
  useListUsageLogs 
} from "@workspace/api-client-react";
import { 
  Activity, 
  DollarSign, 
  MessageSquare, 
  Server,
  FolderKanban
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const COLORS = ['#f97316', '#0ea5e9', '#10b981', '#a855f7', '#ec4899'];

export default function UsagePage() {
  const { data: stats, isLoading: statsLoading } = useGetUsageStats();
  const { data: logs, isLoading: logsLoading } = useListUsageLogs({ limit: 50 });

  if (statsLoading) {
    return (
      <div className="p-8 space-y-6 flex-1">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-8"><Activity className="h-8 w-8 text-primary" /> Usage Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Format data for Recharts
  const barData = stats.dailyCosts.map(d => ({
    name: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    cost: Number(d.costUsd.toFixed(4))
  })).reverse(); // Assuming API sends newest first, reverse for chart left-to-right

  const pieData = stats.byModel.map(m => ({
    name: m.model.split('/').pop() || m.model,
    value: Number(m.totalCostUsd.toFixed(4))
  })).filter(d => d.value > 0);

  return (
    <div className="flex-1 p-8 bg-background overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Activity className="h-8 w-8 text-primary" />
              Usage Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Track API costs, messages, and model distribution.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalCostUsd.toFixed(3)}</div>
              <p className="text-xs text-muted-foreground mt-1">All time spending</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.todayCostUsd.toFixed(3)}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Across {stats.totalConversations} conversations</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top Model</CardTitle>
              <Server className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate" title={stats.topModel || 'None'}>
                {stats.topModel ? stats.topModel.split('/').pop() : 'None'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">By message count</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Costs */}
          <Card className="col-span-1 border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Daily Costs (30 Days)</CardTitle>
              <CardDescription>Spending per day across all models</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: '8px' }}
                      formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
                    />
                    <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Costs by Model */}
          <Card className="col-span-1 border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Spend by Model</CardTitle>
              <CardDescription>Total API costs broken down by provider/model</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <div className="h-[300px] w-full flex items-center justify-center relative">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: '8px' }}
                        formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-muted-foreground text-sm flex flex-col items-center">
                    <Server className="h-8 w-8 mb-2 opacity-50" />
                    No spending data yet
                  </div>
                )}
                {pieData.length > 0 && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <div className="text-2xl font-bold">${stats.totalCostUsd.toFixed(2)}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project & Log Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <Card className="border-border bg-card shadow-sm flex flex-col h-[400px]">
            <CardHeader className="pb-3 flex-none">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FolderKanban className="h-4 w-4" /> Top Projects
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0">
                    <TableRow className="border-border">
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Messages</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.byProject.map((p, i) => (
                      <TableRow key={i} className="border-border">
                        <TableCell className="font-medium">{p.projectName}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{p.totalMessages.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium text-primary">${p.totalCostUsd.toFixed(4)}</TableCell>
                      </TableRow>
                    ))}
                    {stats.byProject.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No project data</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm flex flex-col h-[400px]">
            <CardHeader className="pb-3 flex-none">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Server className="h-4 w-4" /> Recent Generations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0">
                    <TableRow className="border-border">
                      <TableHead>Time</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs?.map((log) => (
                      <TableRow key={log.id} className="border-border text-xs">
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="truncate max-w-[120px]" title={log.model}>
                          {log.model.split('/').pop()}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{log.totalTokens.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">${log.costUsd.toFixed(4)}</TableCell>
                      </TableRow>
                    ))}
                    {!logs?.length && !logsLoading && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No logs found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
