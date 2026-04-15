"use client";

import { useState, useEffect, useRef } from "react";

const SKILLS = [
  { label: "Wallet Portfolio", skill: "wallet-portfolio" },
  { label: "Token Balances", skill: "wallet-balances" },
  { label: "Smart Money Signals", skill: "dex-signal" },
  { label: "Security Scan", skill: "security" },
  { label: "Token Info", skill: "dex-token" },
  { label: "Liquidity Analysis", skill: "dex-liquidity" },
  { label: "Computing Score", skill: "scoring" },
];

export function SkillLoadingSteps({ active, done }: { active: boolean; done: boolean }) {
  const [currentStep, setCurrentStep] = useState(-1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active && !done) {
      setCurrentStep(0);
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => (prev < SKILLS.length - 1 ? prev + 1 : prev));
      }, 400);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, done]);

  useEffect(() => {
    if (done) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setCurrentStep(SKILLS.length);
    }
  }, [done]);

  if (!active && !done) return null;

  return (
    <div className="ox-glass-12 ox-glass-edge rounded-xl p-4 mb-4 animate-fade-in">
      <div className="text-xs text-ox-text-muted mb-3 font-mono">OnchainOS Skills</div>
      <div className="space-y-1.5">
        {SKILLS.map((s, i) => {
          const isDone = i < currentStep || done;
          const isActive = i === currentStep && !done;

          return (
            <div key={s.skill} className="flex items-center gap-2.5 text-sm">
              {isDone ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ox-safe)" strokeWidth="2.5" className="shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : isActive ? (
                <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-ox-cyan animate-pulse" />
                </div>
              ) : (
                <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-ox-border" />
                </div>
              )}
              <span
                className={`font-mono text-xs transition-colors duration-200 ${
                  isDone
                    ? "text-ox-text-secondary"
                    : isActive
                      ? "text-ox-cyan"
                      : "text-ox-text-muted opacity-50"
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
