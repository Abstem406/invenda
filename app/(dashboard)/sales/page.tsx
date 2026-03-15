import { SalesTable } from "@/components/sales/sales-table";

export default function SalesPage() {
    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Registro de Ventas</h1>
                <p className="text-muted-foreground">
                    Gestiona las ventas realizadas y registra nuevas transacciones.
                </p>
            </div>

            <div className="max-w-6xl">
                <SalesTable />
            </div>
        </div>
    );
}
