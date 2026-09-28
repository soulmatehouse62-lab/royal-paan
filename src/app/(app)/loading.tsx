import { Loader } from "@/components/loader";

export default function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Loader size="lg" />
    </div>
  );
}
