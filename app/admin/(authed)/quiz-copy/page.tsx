import { PageHeader } from "@/components/admin/ui";
import { QuizCopyEditor } from "@/components/admin/quiz-copy-editor";
import { loadQuizCopy } from "@/lib/quiz-copy/store";
import { QUIZ_COPY } from "@/lib/quiz-copy/registry";

export const dynamic = "force-dynamic";

export default async function AdminQuizCopyPage() {
  const overrides = await loadQuizCopy();
  const editedCount = Object.keys(overrides).length;

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Quiz wording"
        description="Every question, helper line and button in the quiz. Edits go live immediately; clearing a box puts the original back."
      />
      <QuizCopyEditor
        screens={QUIZ_COPY}
        initial={overrides}
        editedCount={editedCount}
      />
    </>
  );
}
