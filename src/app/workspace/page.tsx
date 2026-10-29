import { ProcurementChat } from "../../components/app/CopilotThread";
export const dynamic = "force-dynamic";
export default function Page() { return <ProcurementChat configured={!!process.env.GEMINI_API_KEY} />; }
