"use client";

import * as React from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import FavoritesStar from "@/components/FavoritesStar";

type Option = {
  value: string;
  label: string;
  metadata?: {
    title: string;
    emoji: string;
  };
};

interface DropdownSearchableProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  size?: 'small' | 'large';
}

export function DropdownSearchable({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  size = 'small',
}: DropdownSearchableProps) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [selectedOption, setSelectedOption] = React.useState<Option | null>(
    options.find((option) => option.value === value) || null
  );

  const handleSelect = (val: string) => {
    const selected = options.find((option) => option.value === val) || null;
    setSelectedOption(selected);
    onChange(val);
    setOpen(false);
  };

  const buttonClasses = "w-full justify-between text-base h-12 px-3" // Added justify-between and px-3

  const renderButtonContent = () => {
    if (selectedOption) {
      return (
        <>
          <span className="truncate mr-2">{selectedOption.label}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </>
      );
    }
    return (
      <>
        <span className="truncate mr-2">+ {placeholder}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </>
    );
  };

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={buttonClasses}>
            {renderButtonContent()}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-full p-0 max-h-[50vh] overflow-y-auto"
          align="start"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <OptionList
            options={options}
            onSelect={handleSelect}
            value={value}
            open={open}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className={buttonClasses}>
          {renderButtonContent()}
        </Button>
      </DrawerTrigger>
      <DrawerContent
        className="mt-0 h-[75vh] flex flex-col"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <OptionList
          options={options}
          onSelect={handleSelect}
          value={value}
          open={open}
        />
      </DrawerContent>
    </Drawer>
  );
}

interface OptionListProps {
  options: Option[];
  onSelect: (value: string) => void;
  value: string;
  open: boolean;
}

function OptionList({ options, onSelect, value, open }: OptionListProps) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const selectedRef = React.useRef<HTMLDivElement>(null);

  // Focus the selected item when the dropdown opens
  React.useEffect(() => {
    if (open && selectedRef.current) {
      selectedRef.current.focus();
    }
  }, [open]);

  // Scroll the selected item into view when the value changes
  React.useEffect(() => {
    if (selectedRef.current && listRef.current) {
      const list = listRef.current;
      const selected = selectedRef.current;
      const listRect = list.getBoundingClientRect();
      const selectedRect = selected.getBoundingClientRect();

      if (
        selectedRect.top < listRect.top ||
        selectedRect.bottom > listRect.bottom
      ) {
        selected.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [value]);

  const itemClasses = "py-2 text-base" // Consistent font size

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Command className="flex-1 flex flex-col overflow-hidden">
        <CommandInput 
          placeholder="Search..." 
          autoFocus={false} 
          className="text-base h-12" // Consistent height and font size
        />
        <CommandList className="flex-1 overflow-y-auto" ref={listRef}>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={(selectedValue) => onSelect(selectedValue)}
                ref={option.value === value ? selectedRef : null}
                className={cn(
                  itemClasses,
                  "flex items-center justify-between",
                  option.value === value
                    ? "bg-accent text-accent-foreground"
                    : ""
                )}
                tabIndex={option.value === value ? 0 : -1}
              >
                <span className="flex-1 truncate">{option.label}</span>
                {option.metadata && option.value !== '_universal' && (
                  <FavoritesStar
                    showId={option.value}
                    showTitle={option.metadata.title}
                    showEmoji={option.metadata.emoji}
                    size="small"
                    className="ml-2"
                  />
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
