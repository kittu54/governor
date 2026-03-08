import { Card, CardContent } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-8 w-20 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-2 w-32 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardContent className="p-6">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-[200px] animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-[200px] animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
