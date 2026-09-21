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
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import type { Question } from "~/types/game";

type QuestionListProps = {
  questions: Question[];
  onReorder: (orderedIds: string[]) => void;
  onView: (question: Question) => void;
  onEdit: (question: Question) => void;
  onDelete: (question: Question) => void;
};

const SortableQuestion = ({
  question,
  onView,
  onEdit,
  onDelete,
}: {
  question: Question;
  onView: (q: Question) => void;
  onEdit: (q: Question) => void;
  onDelete: (q: Question) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: question.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <button
        type="button"
        className="mt-1 cursor-grab touch-none text-slate-400"
        aria-label="Drag to reorder question"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge>{question.type}</Badge>
          <span className="text-xs text-slate-500">
            {question.time_limit_seconds}s · {question.points} pts
          </span>
        </div>
        <p className="truncate font-medium text-slate-900">
          {question.question_text}
        </p>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onView(question)}
          aria-label="View question"
        >
          View
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onEdit(question)} aria-label="Edit question">
          Edit
        </Button>
        <Button size="sm" variant="danger" onClick={() => onDelete(question)} aria-label="Delete question">
          Delete
        </Button>
      </div>
    </li>
  );
};

export const QuestionList = ({
  questions,
  onReorder,
  onView,
  onEdit,
  onDelete,
}: QuestionListProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(questions, oldIndex, newIndex);
    onReorder(next.map((q) => q.id));
  };

  if (questions.length === 0) {
    return <p className="text-slate-500">No questions yet. Add one below.</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={questions.map((q) => q.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-col gap-3">
          {questions.map((question) => (
            <SortableQuestion
              key={question.id}
              question={question}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
};
