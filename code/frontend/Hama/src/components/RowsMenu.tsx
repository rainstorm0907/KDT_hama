import { ChevronDown, Rows3 } from 'lucide-react';
import { useState } from 'react';
import { hairline } from '../styles/hairline';
import { rowCountOptions } from '../types/productList';
import type { RowCountOption } from '../types/productList';

type RowsMenuProps = {
  value: RowCountOption;
  onChange: (value: RowCountOption) => void;
};

export function RowsMenu({ value, onChange }: RowsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative z-[120]"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`inline-flex h-11 min-w-[118px] items-center justify-center gap-2 rounded-[18px] px-4 text-sm font-black transition-colors ${hairline.control} ${hairline.controlHover} ${hairline.focus}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Rows3 className="h-4 w-4" aria-hidden="true" />
        {value}줄
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div
          className={`absolute right-0 top-[calc(100%+10px)] z-[130] w-40 overflow-hidden rounded-[22px] p-2 ${hairline.panel}`}
          role="menu"
        >
          {rowCountOptions.map((option) => {
            const isSelected = value === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`flex h-12 w-full items-center justify-between rounded-[16px] px-4 text-left text-sm font-black transition-colors ${hairline.focus} ${
                  isSelected
                    ? hairline.controlActive
                    : `${hairline.controlHover} text-[#4B5563]`
                }`}
                role="menuitemradio"
                aria-checked={isSelected}
              >
                <span>{option}줄</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
