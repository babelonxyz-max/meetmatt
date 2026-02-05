"use client";

import { useState, useEffect, useCallback } from "react";

interface UseCountdownReturn {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  reset: (newTargetDate: Date) => void;
}

export function useCountdown(targetDate: Date): UseCountdownReturn {
  const calculateTimeLeft = useCallback(() => {
    const difference = targetDate.getTime() - new Date().getTime();

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      isExpired: false,
    };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  const reset = useCallback((newTargetDate: Date) => {
    const difference = newTargetDate.getTime() - new Date().getTime();
    setTimeLeft({
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      isExpired: difference <= 0,
    });
  }, []);

  return { ...timeLeft, reset };
}
