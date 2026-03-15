"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Loader2, LogIn, AlertCircle } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await login({ email, password });
            router.push("/");
        } catch {
            setError("Credenciales inválidas. Verifica tu correo y contraseña.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md px-4">
            {/* Branding */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Invenda
                </h1>
                <p className="text-muted-foreground mt-2 text-sm">
                    Sistema de gestión de inventario y ventas
                </p>
            </div>

            {/* Login Card */}
            <Card className="border-border/50 shadow-xl backdrop-blur-sm">
                <CardHeader className="space-y-1 pb-4">
                    <CardTitle className="text-2xl font-semibold text-center">
                        Iniciar Sesión
                    </CardTitle>
                    <CardDescription className="text-center">
                        Ingresa tus credenciales para acceder al panel
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Error Alert */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Email Field */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo electrónico</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="correo@invenda.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                                autoComplete="email"
                                autoFocus
                            />
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                autoComplete="current-password"
                            />
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full mt-2"
                            size="lg"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Iniciando sesión...
                                </>
                            ) : (
                                <>
                                    <LogIn className="mr-2 h-4 w-4" />
                                    Iniciar Sesión
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Footer */}
            <p className="text-center text-xs text-muted-foreground mt-6">
                © {new Date().getFullYear()} Invenda. Todos los derechos reservados.
            </p>
        </div>
    );
}
