import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { OrderItem } from "~/types/questions";

type OrderProps = {
  items: OrderItem[];
  disabled?: boolean;
  onChange: (items: OrderItem[]) => void;
};

const SortableRow = ({
  item,
  index,
  disabled,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: {
  item: OrderItem;
  index: number;
  disabled?: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex min-h-14 items-center gap-2 rounded-lg border-2 border-festival-border bg-white px-3 py-3 ${
        isDragging ? "z-10 shadow-elevated" : ""
      } ${disabled ? "opacity-60" : ""}`}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-festival-cream-soft font-sans text-sm font-bold text-festival-navy"
        aria-hidden
      >
        {index + 1}
      </span>
      <button
        type="button"
        className="cursor-grab touch-none px-1 text-festival-muted active:cursor-grabbing"
        aria-label={`Drag to reorder ${item.text}`}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <span className="min-w-0 flex-1 font-sans font-medium text-festival-navy">
        {item.text}
      </span>
      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          disabled={disabled || isFirst}
          onClick={onMoveUp}
          aria-label={`Move ${item.text} up`}
          className="rounded border border-festival-border px-2 py-1 font-sans text-xs font-semibold text-festival-navy disabled:opacity-40"
        >
          Up
        </button>
        <button
          type="button"
          disabled={disabled || isLast}
          onClick={onMoveDown}
          aria-label={`Move ${item.text} down`}
          className="rounded border border-festival-border px-2 py-1 font-sans text-xs font-semibold text-festival-navy disabled:opacity-40"
        >
          Down
        </button>
      </div>
    </li>
  );
};

export const Order = ({ items, disabled, onChange }: OrderProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (disabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(items, oldIndex, newIndex));
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    if (disabled) return;
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    onChange(arrayMove(items, index, next));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-col gap-3" aria-label="Put items in order">
          {items.map((item, index) => (
            <SortableRow
              key={item.id}
              item={item}
              index={index}
              disabled={disabled}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              onMoveUp={() => handleMove(index, -1)}
              onMoveDown={() => handleMove(index, 1)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
};
