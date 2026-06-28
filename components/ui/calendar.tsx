"use client";

import { DayPicker } from "react-day-picker";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={es}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      components={{
        Chevron: ({ orientation }: { orientation?: string }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      classNames={{
        root: "",
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium capitalize",
        nav: "flex items-start",
        button_previous:
          "absolute left-1 top-0 h-7 w-7 inline-flex items-center justify-center rounded-md border border-input bg-transparent p-0 opacity-50 hover:opacity-100",
        button_next:
          "absolute right-1 top-0 h-7 w-7 inline-flex items-center justify-center rounded-md border border-input bg-transparent p-0 opacity-50 hover:opacity-100",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground w-8 font-normal text-[0.8rem] text-center",
        weeks: "",
        week: "flex w-full mt-2",
        day: "relative p-0 text-center text-sm",
        day_button:
          "h-8 w-8 p-0 font-normal inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground",
        selected:
          "bg-primary! text-primary-foreground! rounded-md hover:bg-primary! hover:text-primary-foreground!",
        today: "bg-accent text-accent-foreground rounded-md",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        focused: "",
        hidden: "invisible",
        range_start: "",
        range_end: "",
        range_middle: "",
        weeks_before_enter: "",
        weeks_before_exit: "",
        weeks_after_enter: "",
        weeks_after_exit: "",
        caption_after_enter: "",
        caption_after_exit: "",
        caption_before_enter: "",
        caption_before_exit: "",
        chevron: "h-4 w-4",
        dropdowns: "",
        dropdown: "",
        dropdown_root: "",
        footer: "",
        months_dropdown: "",
        years_dropdown: "",
        week_number: "",
        week_number_header: "",
        ...classNames,
      }}
      {...props}
    />
  );
}
