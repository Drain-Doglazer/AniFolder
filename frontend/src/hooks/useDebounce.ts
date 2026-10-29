import { useState, useEffect } from 'react';

// Хук для задержки обновления значения (полезно для поиска)
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Устанавливаем таймер на обновление значения
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Очищаем таймер, если value изменилось до истечения задержки
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}