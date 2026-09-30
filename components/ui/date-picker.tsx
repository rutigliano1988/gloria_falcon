"use client";

import { useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Primer año seleccionable (por defecto, 1930: cubre fechas de nacimiento de representantes). */
  fromYear?: number;
  /** Último año seleccionable (por defecto, el próximo año). */
  toYear?: number;
}

const ANIO_ACTUAL = new Date().getFullYear();

export function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  className,
  disabled,
  fromYear = 1930,
  toYear = ANIO_ACTUAL + 1,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const selected = value ? parseISO(value) : undefined;
  const display =
    selected && isValid(selected)
      ? format(selected, "dd/MM/yyyy", { locale: es })
      : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-9",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {display}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? format(date, "yyyy-MM-dd") : "");
            setOpen(false);
          }}
          defaultMonth={selected}
          // Selectores de mes y año: sin esto, llegar a 1985 exigía ~500 clics.
          captionLayout="dropdown"
          startMonth={new Date(fromYear, 0)}
          endMonth={new Date(toYear, 11)}
        />
      </PopoverContent>
    </Popover>
  );
}
