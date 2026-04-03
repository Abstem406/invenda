import { SalesTable } from "@/components/sales/sales-table";

export default function SalesPage() {
    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto pb-24 md:pb-8">
            <div className="w-full">
                <SalesTable />
            </div>
        </div>
    );
}
