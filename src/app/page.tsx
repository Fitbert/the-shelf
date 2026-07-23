import AppShell from "@/components/AppShell";
import { listRecords } from "@/lib/actions";

export default async function Home() {
  const records = await listRecords();
  return <AppShell initialRecords={records} />;
}
