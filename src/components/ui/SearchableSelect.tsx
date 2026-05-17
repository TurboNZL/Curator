import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown } from "lucide-react";
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

interface SearchableSelectProps {
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  allowCustom?: boolean;
}

export const SearchableSelect = ({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  emptyText = "No results found.",
  className,
  allowCustom = false,
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const selectedLabel = useMemo(() => {
    return options.find((opt) => opt.value === value)?.label || value;
  }, [options, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800", className)}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-zinc-950 border-zinc-800">
        <Command className="bg-transparent">
          <CommandInput
            placeholder={placeholder}
            className="h-9 text-white"
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty className="p-2">
              {allowCustom && inputValue ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-xs text-blue-400"
                  onClick={() => {
                    onValueChange(inputValue);
                    setOpen(false);
                  }}
                >
                  Create "{inputValue}"
                </Button>
              ) : (
                <span className="text-xs text-zinc-500">{emptyText}</span>
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className="text-white focus:bg-zinc-900 cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
