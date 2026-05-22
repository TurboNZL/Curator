"use client";

import * as React from "react";
import { X, Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface MultiSelectSearchProps {
  options: { value: string; label: string }[];
  selected: { value: string; label: string }[];
  onSelectedChange: (selected: { value: string; label: string }[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const MultiSelectSearch: React.FC<MultiSelectSearchProps> = ({
  options,
  selected,
  onSelectedChange,
  placeholder = "Select items...",
  disabled = false,
  className,
}) => {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSelect = (item: { value: string; label: string }) => {
    const isSelected = selected.some(s => s.value === item.value);
    if (isSelected) {
      onSelectedChange(selected.filter(s => s.value !== item.value));
    } else {
      onSelectedChange([...selected, item]);
    }
    inputRef.current?.focus(); // Keep focus on input after selection
  };

  const handleRemove = (item: { value: string; label: string }) => {
    onSelectedChange(selected.filter(s => s.value !== item.value));
    inputRef.current?.focus();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-auto min-h-10 w-full justify-between flex-wrap p-1 text-sm bg-zinc-900 border-zinc-800",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          disabled={disabled}
        >
          {selected.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selected.map((item) => (
                <Badge
                  key={item.value}
                  variant="secondary"
                  className="bg-zinc-800 text-zinc-200 hover:bg-zinc-700 flex items-center gap-1 pr-1 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent opening popover when clicking badge
                    handleRemove(item);
                  }}
                >
                  {item.label}
                  <X className="h-3 w-3 text-zinc-400 hover:text-white" />
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-zinc-500 text-xs">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-zinc-900 border-zinc-700">
        <Command loop>
          <CommandInput placeholder={placeholder} ref={inputRef} />
          <CommandList>
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup>
              {options.map((item) => {
                const isSelected = selected.some(s => s.value === item.value);
                return (
                  <CommandItem
                    key={item.value}
                    value={item.label}
                    onSelect={() => handleSelect(item)}
                    className="text-sm cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {item.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};