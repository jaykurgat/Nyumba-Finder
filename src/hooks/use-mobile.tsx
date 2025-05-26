
"use client"; // Ensure this is a client component

import * as React from "react";

const MOBILE_BREAKPOINT = 768; // Corresponds to md: in Tailwind

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    // Initial check
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    if (typeof window !== 'undefined') {
        checkDevice(); // Set initial state
        window.addEventListener("resize", checkDevice);
        // Cleanup listener on component unmount
        return () => window.removeEventListener("resize", checkDevice);
    } else {
        // Default for SSR or environments without window, assume not mobile.
        // This helps prevent hydration mismatches if client defaults to true immediately.
        setIsMobile(false); 
    }
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

  // Return false during initial undefined state to prevent SSR mismatch if the first client render is different
  return isMobile === undefined ? false : isMobile;
}
