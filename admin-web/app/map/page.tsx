/**"use client";

export default function MapPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-normal mb-4">Map (Static Image)</h1>

      <div className="w-full h-[80vh] border rounded-xl overflow-hidden shadow">
        <img
          src="/images/static-map.jpg"
          alt="static map"
          className="w-full h-full object-contain bg-black"
        />
      </div>
    </div>
  );
}
*/

// app/map/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MapRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/farm-management");
  }, [router]);
  return null;
}
