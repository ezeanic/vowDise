"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./ui";

type BecomeVendorButtonProps = {
  className?: string;
  children?: ReactNode;
};

export function BecomeVendorButton({ className, children }: BecomeVendorButtonProps) {
  const router = useRouter();

  function handleClick() {
    const savedAccount = localStorage.getItem("vowdiseAccount");
    router.push(savedAccount ? "/vendor-onboarding" : "/sign-in?capability=vendor&next=/vendor-onboarding");
  }

  return (
    <Button type="button" className={className} onClick={handleClick}>
      {children ?? (
        <>
          Add business <ArrowRight size={18} />
        </>
      )}
    </Button>
  );
}
