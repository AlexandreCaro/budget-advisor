import { CategoriesView } from "@/components/categories/categories-view";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Loading component for categories
const CategoriesLoading = () => (
  <div className="container mx-auto py-6 space-y-6">
    <Skeleton className="h-8 w-48" />
    <div className="grid grid-cols-12 gap-6">
      <Skeleton className="col-span-3 h-[calc(100vh-12rem)]" />
      <Skeleton className="col-span-9 h-[calc(100vh-12rem)]" />
    </div>
  </div>
);

export default async function CategoriesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <Suspense fallback={<CategoriesLoading />}>
      <div className="container mx-auto py-6">
        <CategoriesView />
      </div>
    </Suspense>
  );
} 