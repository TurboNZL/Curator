"use client";

import * as React from "react";
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
  allowCustom?: boolean;
  disabled?: boolean; // Added disabled prop
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onValueChange,
  placeholder = "Select an item...",
  allowCustom = false,
  disabled = false, // Default to false
  className,
}) => {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(
    options.find((option) => option.value === value)?.label || "",
  );

  React.useEffect(() => {
    // When the external value changes, update the internal input value
    const selectedOption = options.find((option) => option.value === value);
    setInputValue(selectedOption?.label || "");
  }, [value, options]);

  const handleSelect = (currentValue: string) => {
    // If the selected item is one of the options
    const selectedOption = options.find((option) => option.value === currentValue);
    if (selectedOption) {
      onValueChange(selectedOption.value);
      setInputValue(selectedOption.label);
    } else if (allowCustom) {
      // If custom values are allowed and the current value is new
      onValueChange(currentValue);
      setInputValue(currentValue);
    } else {
      // If not found and custom not allowed, reset
      onValueChange("");
      setInputValue("");
    }
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    // If custom is allowed, treat input value as a potential custom selection
    // But don't call onValueChange until selection or blur for better control
  };

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          disabled={disabled}
        >
          {inputValue ? (
            <span className="truncate">{inputValue}</span>
          ) : (
            <span className="text-zinc-500">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-zinc-900 border-zinc-700">
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {allowCustom ? `Create "${inputValue}"` : "No item found."}
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => handleSelect(option.value)}
                  className="text-sm cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
              {allowCustom && inputValue && !options.some(opt => opt.label.toLowerCase() === inputValue.toLowerCase()) && (
                <CommandItem
                  onSelect={() => handleSelect(inputValue)}
                  className="text-sm cursor-pointer text-blue-400"
                >
                  <Plus className="mr-2 h-4 w-4" /> Create "{inputValue}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};