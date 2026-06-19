import { toast } from "sonner";

export const appToast = {
  success: (message: string, description?: string) =>
    toast.success(message, description ? { description } : undefined),

  error: (message: string, description?: string) =>
    toast.error(message, description ? { description } : undefined),

  warning: (message: string, description?: string) =>
    toast.warning(message, description ? { description } : undefined),

  info: (message: string, description?: string) =>
    toast.info(message, description ? { description } : undefined),

  /** Replaces window.confirm — returns true when user confirms. */
  confirm: (
    message: string,
    options?: {
      description?: string;
      confirmLabel?: string;
      cancelLabel?: string;
    },
  ): Promise<boolean> =>
    new Promise((resolve) => {
      const id = toast(message, {
        description: options?.description,
        duration: Infinity,
        action: {
          label: options?.confirmLabel ?? "Confirm",
          onClick: () => {
            toast.dismiss(id);
            resolve(true);
          },
        },
        cancel: {
          label: options?.cancelLabel ?? "Cancel",
          onClick: () => {
            toast.dismiss(id);
            resolve(false);
          },
        },
      });
    }),
};
