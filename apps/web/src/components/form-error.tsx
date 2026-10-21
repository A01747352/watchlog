import { CircleAlert } from "lucide-react";

/** Error de formulario: icono circle-alert en destructive + role="alert" (HANDOFF §4, Estados). */
export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-small text-destructive flex items-start gap-2">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}
