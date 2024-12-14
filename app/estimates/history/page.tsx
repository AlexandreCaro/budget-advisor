import { HistoricalEstimatesView } from "@/components/estimates/historical-view";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HistoricalEstimatesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return <HistoricalEstimatesView />;
} 