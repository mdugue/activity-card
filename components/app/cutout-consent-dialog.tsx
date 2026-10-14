"use client";

// Asks once before "text behind the horizon" downloads its depth model. The
// photo never leaves the device, but the model does arrive over the network,
// so the size is spelled out, with a nudge towards Wi-Fi.

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DEPTH_MODEL } from "@/lib/horizon-depth";

interface CutoutConsentDialogProps {
  onConfirm: () => void;
  onDecline: () => void;
  open: boolean;
}

export const CutoutConsentDialog = ({
  open,
  onConfirm,
  onDecline,
}: CutoutConsentDialogProps) => (
  <AlertDialog
    onOpenChange={(next) => {
      if (!next) {
        onDecline();
      }
    }}
    open={open}
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Download the depth model?</AlertDialogTitle>
        <AlertDialogDescription>
          To put your title behind the horizon, Effort downloads an image model
          ({DEPTH_MODEL.mb} MB) onto this device once. Your photo stays on your
          device. On mobile data, Wi-Fi may be the better moment.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Not now</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>
          Download {DEPTH_MODEL.mb} MB
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
