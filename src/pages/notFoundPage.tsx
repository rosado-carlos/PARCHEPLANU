import { Link } from "react-router-dom";
import StateMessage from "../components/ui/StateMessage";

export default function NotFoundPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <StateMessage
        type="empty"
        title="Page not found"
        description="The route you requested does not exist in ParchePlan U."
      />
      <div className="mt-4 text-center">
        <Link to="/" className="text-sm text-brand-700 hover:underline">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
