"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
} from "lucide-react";

const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      customAriaLabel="Notifications"
      offset={16}
      mobileOffset={16}
      gap={8}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <CircleAlertIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        closeButtonAriaLabel: "Dismiss notification",
        ...toastOptions,
        classNames: {
          toast:
            "items-start! gap-2.5! rounded-lg! py-3.5! pr-[46px]! pl-4! font-sans! leading-[18px]! shadow-elev-lg!",
          title: "leading-[18px]! font-medium!",
          description: "leading-[18px]! wrap-anywhere",
          icon: "mx-0! mt-px! size-4!",
          closeButton:
            "top-[11px]! right-3! left-auto! size-6! transform-none! rounded-sm! border-0! bg-transparent! text-inherit! opacity-80 transition-opacity duration-150 ease-out hover:bg-transparent! hover:opacity-100 focus-visible:shadow-none! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none max-sm:top-1! max-sm:right-1! max-sm:size-10! [&_svg]:size-4",
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
