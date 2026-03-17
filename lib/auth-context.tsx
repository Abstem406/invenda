"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api, type User, type LoginCredentials } from "@/lib/services/api";

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch the current user session
    const refreshUser = useCallback(async () => {
        try {
            const currentUser = await api.auth.me();
            setUser(currentUser);
        } catch {
            // access_token likely expired — try refreshing it manually and retry
            try {
                await api.auth.refresh();
                const currentUser = await api.auth.me();
                setUser(currentUser);
            } catch {
                setUser(null);
            }
        }
    }, []);

    // Check session on mount
    useEffect(() => {
        refreshUser().finally(() => setIsLoading(false));
    }, [refreshUser]);

    const login = async (credentials: LoginCredentials) => {
        const loggedInUser = await api.auth.login(credentials);
        setUser(loggedInUser);
    };

    const logout = async () => {
        try {
            await api.auth.logout();
        } catch (error) {
            console.warn("Backend rejected logout (e.g. session already expired). Clearing local state...");
        } finally {
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
