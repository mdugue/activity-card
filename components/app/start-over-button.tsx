"use client";

import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface StartOverButtonProps {
  onConfirm: () => void;
}

/**
 * Header CTA that lets the athlete abandon the current card and start fresh,
 * gated behind a confirm dialog since it discards their in-progress work — and
 * the saved draft. Closing happens implicitly: confirming resets app state,
 * which unmounts this button (and the dialog with it).
 */
export function StartOverButton({ onConfirm }: StartOverButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            className="h-9 gap-2 px-3 text-xs"
            size="sm"
            variant="outline"
          />
        }
      >
        <ArrowCounterClockwiseIcon
          aria-hidden
          className="size-4"
          weight="bold"
        />
        Start over
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Start over?</AlertDialogTitle>
          <AlertDialogDescription>
            Your current card will be discarded. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} variant="destructive">
            Discard card
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
