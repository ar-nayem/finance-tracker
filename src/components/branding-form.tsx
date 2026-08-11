"use client";

import { useActionState } from "react";
import { updateBranding } from "@/lib/actions";

export function BrandingForm({
  currentDisplayName,
  currentLogoDataUrl,
}: {
  currentDisplayName: string | null;
  currentLogoDataUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateBranding, undefined);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="field-label">Display name</span>
          <input
            type="text"
            name="displayName"
            defaultValue={currentDisplayName ?? ""}
            placeholder="Finance Tracker"
            className="input w-56"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="field-label">Logo (image, under 300KB)</span>
          <input type="file" name="logo" accept="image/*" className="input-file" />
        </label>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving..." : "Update branding"}
        </button>
      </div>

      {currentLogoDataUrl && (
        <label className="flex items-center gap-2 text-sm text-foreground/60">
          <input type="checkbox" name="removeLogo" value="true" className="cursor-pointer" />
          Remove current logo
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentLogoDataUrl} alt="Current logo" className="ml-2 h-8 w-8 rounded object-cover" />
        </label>
      )}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-accent">{state.success}</p>}
    </form>
  );
}
