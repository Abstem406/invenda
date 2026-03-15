"use client"

import { PricesTable } from "@/components/prices/prices-table";

export default function PricesPage() {
    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Precios por Moneda</h1>
                <p className="text-muted-foreground">
                    Gestiona los precios de tus productos en USD, COP y VES.
                </p>
            </div>

            <div className="max-w-6xl">
                <PricesTable />
            </div>
        </div>
    );
}
