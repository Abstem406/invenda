import { UsersTable } from "@/components/users/users-table"

export default function UsersPage() {
    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
                <p className="text-muted-foreground">
                    Administra los accesos de los empleados, crea nuevos cajeros y establece roles.
                </p>
            </div>
            <UsersTable />
        </div>
    )
}
