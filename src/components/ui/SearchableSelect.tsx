"use client";

import * as React from "react";
import { Check, ChevronsUpDown, PlusCircle, Search as SearchIcon } from "lucide-react";

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
import { Input } from "./input";
import { Label } from "./label";

interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  itemClassName?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  allowCustom = false,
  disabled = false,
  className,
  contentClassName,
  itemClassName,
}) => {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  React.useEffect(() => {
    // Set input value to current label when value changes from outside
    const currentOption = options.find((option) => option.value === value);
    setInputValue(currentOption ? currentOption.label : value || "");
  }, [value, options]);

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
  };

  const handleCustomSubmit = () => {
    if (inputValue.trim() && allowCustom) {
      handleSelect(inputValue.trim()); // Use input value as both value and label for custom
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal text-sm bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 hover:text-white",
            className,
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          {options.find((option) => option.value === value)?.label ||
            (value ? value : placeholder)}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[--radix-popover-trigger-width] p-0 bg-zinc-950 border-zinc-800 text-white", contentClassName)}>
        <Command className="bg-zinc-950 text-white">
          <CommandInput
            placeholder={placeholder}
            className="text-white placeholder:text-zinc-500 border-b border-zinc-800"
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty className="py-6 text-center text-sm text-zinc-400">
              {allowCustom && inputValue.trim() ? (
                <div className="flex flex-col items-center gap-2">
                  <p>No results found for "{inputValue}"</p>
                  <Button
                    variant="link"
                    onClick={handleCustomSubmit}
                    className="text-blue-500 text-sm h-auto p-0"
                  >
                    <PlusCircle className="mr-1 h-4 w-4" /> Create "{inputValue}"
                  </Button>
                </div>
              ) : (
                "No results found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label} // Use label for command searchability
                  onSelect={() => handleSelect(option.value)}
                  className={cn(
                    "text-white hover:bg-zinc-800",
                    itemClassName,
                    value === option.value && "bg-zinc-800 text-blue-400"
                  )}
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