"use client";

import * as React from "react";
import { X, Check, Search as SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MultiSelectSearchOption {
  value: string;
  label: string;
}

interface MultiSelectSearchProps {
  options: MultiSelectSearchOption[];
  selected: MultiSelectSearchOption[];
  onSelectedChange: (selected: MultiSelectSearchOption[]) => void;
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
  const [inputValue, setInputValue] = React.useState("");

  const handleSelect = (option: MultiSelectSearchOption) => {
    const isSelected = selected.some(item => item.value === option.value);
    if (isSelected) {
      onSelectedChange(selected.filter(item => item.value !== option.value));
    } else {
      onSelectedChange([...selected, option]);
    }
    setInputValue(""); // Clear input after selection
  };

  const handleRemove = (itemToRemove: MultiSelectSearchOption) => {
    onSelectedChange(selected.filter(item => item.value !== itemToRemove.value));
  };

  const filteredOptions = React.useMemo(() => {
    const lowerInputValue = inputValue.toLowerCase();
    return options.filter(option =>
      option.label.toLowerCase().includes(lowerInputValue) &&
      !selected.some(item => item.value === option.value)
    );
  }, [options, selected, inputValue]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white",
            "focus-within:ring-1 focus-within:ring-blue-500",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
        >
          <div className="flex flex-wrap gap-1">
            {selected.length === 0 && (
              <span className="text-zinc-500">{placeholder}</span>
            )}
            {selected.map((item) => (
              <Badge
                key={item.value}
                variant="secondary"
                className="bg-zinc-800 text-white hover:bg-zinc-700 cursor-pointer text-xs group/badge"
                onClick={(e) => {
                  if (!disabled) {
                    e.stopPropagation(); // Prevent popover from closing immediately
                    handleRemove(item);
                  }
                }}
              >
                {item.label}
                {!disabled && (
                  <X className="ml-1 h-3 w-3 text-zinc-500 group-hover/badge:text-white" />
                )}
              </Badge>
            ))}
          </div>
          <SearchIcon className="h-4 w-4 text-zinc-500" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-zinc-950 border-zinc-800 text-white">
        <Command className="bg-zinc-950 text-white">
          <CommandInput
            placeholder="Search..."
            className="text-white placeholder:text-zinc-500 border-b border-zinc-800"
            value={inputValue}
            onValueChange={setInputValue}
            disabled={disabled}
          />
          <CommandList>
            <CommandGroup>
              {filteredOptions.length === 0 && (
                <CommandItem disabled>
                  <span className="text-zinc-500">No items found.</span>
                </CommandItem>
              )}
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => handleSelect(option)}
                  className="text-white hover:bg-zinc-800"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.some(item => item.value === option.value) ? "opacity-100" : "opacity-0"
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