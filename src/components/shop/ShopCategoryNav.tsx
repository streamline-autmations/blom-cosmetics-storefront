import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SHOP_CATEGORY_TREE, ShopCategory, categoryPath } from '../../lib/shopCategories';

interface NavProps {
  selected: string;
  counts: Record<string, number>;
  onSelect: (slug: string) => void;
}

const visible = (nodes: ShopCategory[] | undefined, counts: Record<string, number>) =>
  (nodes || []).filter((node) => (counts[node.slug] || 0) > 0);

type ChipItem = { slug: string; label: string; count?: number; hasChildren?: boolean };
type Row = { key: string; label: string; active: string; items: ChipItem[] };

/**
 * Mobile: one scrollable row of main categories. Picking one with sub-categories
 * reveals a second row of chips. A third level (Colour Acrylics -> Standard /
 * Glitter / Exclusive) is a dropdown instead, so it reads as "inside" the chip
 * above it rather than as another identical row.
 */
export const CategoryChipRows: React.FC<NavProps> = ({ selected, counts, onSelect }) => {
  const path = categoryPath(selected);
  const rows: Row[] = [
    {
      key: 'root',
      label: 'Categories',
      active: path[0]?.slug || selected,
      items: [
        { slug: 'all', label: 'All' },
        ...visible(SHOP_CATEGORY_TREE, counts).map((node) => ({ slug: node.slug, label: node.shortName || node.name })),
      ],
    },
  ];

  path.forEach((node, depth) => {
    const children = visible(node.children, counts);
    if (children.length === 0) return;
    rows.push({
      key: node.slug,
      label: node.name,
      active: path[depth + 1]?.slug || node.slug,
      items: [
        { slug: node.slug, label: `All ${node.name}`, count: counts[node.slug] },
        ...children.map((child) => ({
          slug: child.slug,
          label: child.shortName || child.name,
          count: counts[child.slug],
          hasChildren: visible(child.children, counts).length > 0,
        })),
      ],
    });
  });

  return (
    <div className="space-y-2">
      {rows.map((row, depth) =>
        depth >= 2 ? (
          <TypeSelect key={row.key} row={row} onSelect={onSelect} />
        ) : (
          <ChipRow key={row.key} row={row} depth={depth} onSelect={onSelect} />
        )
      )}
    </div>
  );
};

/** Third level as a native dropdown: opens the phone's own picker, which is the easiest control to use. */
const TypeSelect: React.FC<{ row: Row; onSelect: (slug: string) => void }> = ({ row, onSelect }) => {
  const id = `type-select-${row.key}`;
  const narrowed = row.active !== row.key;
  return (
    <div className="flex items-center gap-3 pt-0.5">
      <label htmlFor={id} className="shrink-0 text-[13px] font-medium text-gray-500">
        {row.label.replace(/ Acrylics$/, '')} type
      </label>
      <div className="relative flex-1 max-w-[16rem]">
        <select
          id={id}
          value={row.active}
          onChange={(e) => onSelect(e.target.value)}
          className={`w-full h-10 appearance-none rounded-lg border pl-3 pr-9 text-base font-medium focus:outline-none focus:ring-2 focus:ring-pink-300 ${
            narrowed ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-gray-300 bg-white text-gray-800'
          }`}
        >
          {row.items.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.slug === row.key ? 'All' : item.label}
              {item.count !== undefined ? ` (${item.count})` : ''}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" aria-hidden />
      </div>
    </div>
  );
};

const ChipRow: React.FC<{
  row: Row;
  depth: number;
  onSelect: (slug: string) => void;
}> = ({ row, depth, onSelect }) => {
  const activeRef = useRef<HTMLButtonElement>(null);

  // Keep the active chip in view by scrolling the row sideways only (never the page).
  useEffect(() => {
    const chip = activeRef.current;
    const rowEl = chip?.parentElement;
    if (!chip || !rowEl) return;
    rowEl.scrollTo({ left: chip.offsetLeft - (rowEl.clientWidth - chip.offsetWidth) / 2, behavior: 'smooth' });
  }, [row.active]);

  const isRoot = depth === 0;

  return (
    <div
      role="group"
      aria-label={isRoot ? 'Shop categories' : `${row.label} categories`}
      className="relative flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 scroll-px-4 py-0.5 snap-x"
    >
      {row.items.map((item) => {
        const active = item.slug === row.active;
        return (
          <button
            key={item.slug}
            ref={active ? activeRef : undefined}
            type="button"
            onClick={() => onSelect(item.slug)}
            aria-pressed={active}
            className={`snap-start shrink-0 whitespace-nowrap rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-1 ${
              isRoot ? 'h-10 px-4 text-sm font-semibold' : 'h-9 px-3.5 text-[13px] font-medium'
            } ${
              active
                ? isRoot
                  ? 'bg-pink-600 border-pink-600 text-white'
                  : 'bg-pink-50 border-pink-300 text-pink-700'
                : 'bg-white border-gray-200 text-gray-700 active:bg-gray-50'
            }`}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={`ml-1.5 tabular-nums ${active ? 'text-pink-500' : 'text-gray-400'}`}>{item.count}</span>
            )}
            {item.hasChildren && (
              <ChevronDown className={`inline-block w-3.5 h-3.5 ml-1 -mt-0.5 ${active ? 'text-pink-500' : 'text-gray-400'}`} aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
};

/** Desktop sidebar: the same tree, collapsible, opened along the selected path. */
export const CategorySidebarTree: React.FC<NavProps> = ({ selected, counts, onSelect }) => {
  const [open, setOpen] = useState<Set<string>>(() => new Set(categoryPath(selected).map((c) => c.slug)));

  useEffect(() => {
    setOpen((prev) => {
      const next = new Set(prev);
      categoryPath(selected).forEach((c) => next.add(c.slug));
      return next;
    });
  }, [selected]);

  const toggle = (slug: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  const renderRow = (slug: string, label: string, depth: number, node?: ShopCategory) => {
    const active = selected === slug;
    const children = visible(node?.children, counts);
    const isOpen = open.has(slug);
    return (
      <li key={slug}>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => {
              onSelect(slug);
              if (children.length) setOpen((prev) => new Set(prev).add(slug));
            }}
            aria-current={active ? 'page' : undefined}
            className={`flex-1 flex items-center justify-between text-left rounded-md py-1.5 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${
              depth === 0 ? 'text-sm' : 'text-[13px]'
            } ${active ? 'font-bold text-pink-600' : depth === 0 ? 'font-medium text-gray-700 hover:text-gray-900' : 'text-gray-500 hover:text-pink-600'}`}
          >
            <span>{label}</span>
            <span className={`text-xs tabular-nums ${active ? 'text-pink-400' : 'text-gray-400'}`}>
              {counts[slug] ?? 0}
            </span>
          </button>
          {children.length > 0 && (
            <button
              type="button"
              onClick={() => toggle(slug)}
              aria-expanded={isOpen}
              aria-label={`${isOpen ? 'Hide' : 'Show'} ${label} sub-categories`}
              className="ml-1 p-1 rounded text-gray-400 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
        {children.length > 0 && isOpen && (
          <ul className="ml-2 pl-3 border-l border-gray-100 mb-1">
            {children.map((child) => renderRow(child.slug, child.name, depth + 1, child))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <ul className="space-y-0.5">
      {renderRow('all', 'All Products', 0)}
      {visible(SHOP_CATEGORY_TREE, counts).map((node) => renderRow(node.slug, node.name, 0, node))}
    </ul>
  );
};
