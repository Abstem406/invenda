"use client";

import { useAuth } from "@/lib/auth-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoading } = useAuth();

    // Show loading spinner while checking auth session
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <TooltipProvider>
            <SidebarProvider>
                <AppSidebar />
                <div className="flex flex-col w-full h-screen overflow-hidden">
                    <header className="flex items-center h-16 shrink-0 px-8 border-b gap-4">
                        <SidebarTrigger className="md:flex hidden" />
                        <div className="font-semibold text-lg">Panel de Control</div>
                    </header>
                    <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
                        {children}
                    </main>
                </div>
                <MobileBottomNav />
            </SidebarProvider>
        </TooltipProvider>
    );
}

