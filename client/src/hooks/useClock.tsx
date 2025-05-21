import { useState, useEffect } from "react";

interface ClockReturn {
  formattedTime: string;
  date: Date;
}

export function useClock(): ClockReturn {
  const [date, setDate] = useState<Date>(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setDate(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(intervalId);
  }, []);

  // Format as YYYY-MM-DD HH:MM
  const formattedTime = `${date.toISOString().split('T')[0]} ${date.toTimeString().split(' ')[0].substring(0, 5)}`;

  return { formattedTime, date };
}
