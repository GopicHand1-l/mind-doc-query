import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  FileText,
  MessagesSquare,
  ScanSearch,
  FlaskConical,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/chat", label: "AI Chat", icon: MessagesSquare },
  { to: "/search", label: "Search Explorer", icon: ScanSearch },
  { to: "/evaluation", label: "Evaluation", icon: FlaskConical },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-1.5 py-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-primary font-display text-sm font-bold text-sidebar-primary-foreground">
            Dm
          </div>
          <div className="leading-tight group-data-[collapsible=icon]:hidden">
            <div className="font-display text-sm font-semibold text-sidebar-accent-foreground">
              DocuMind AI
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
              Document assistant
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link to={item.to}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserBox />
      </SidebarFooter>
    </Sidebar>
  );
}

function UserBox() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);
  return (
    <div className="flex items-center gap-2 rounded-md border border-sidebar-border px-2.5 py-2 group-data-[collapsible=icon]:hidden">
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-sidebar-foreground/80">{email ?? "…"}</span>
      <button
        aria-label="Sign out"
        className="text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
        onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}
