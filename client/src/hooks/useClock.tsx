import { useState, useEffect } from "react";

interface ClockReturn {
  formattedTime: string;
  compactTime: string;
  date: Date;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function useClock(): ClockReturn {
  const [date, setDate] = useState<Date>(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setDate(new Date());
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());

  const formattedTime = `${yyyy}-${mm}-${dd} ${hh}:${mi}`;

  const monthShort = date.toLocaleString("en-US", { month: "short" });
  const compactTime = `${monthShort} ${date.getDate()}, ${hh}:${mi}`;

  return { formattedTime, compactTime, date };
}
