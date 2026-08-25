import type { ButtonHTMLAttributes, ReactNode } from "react";
import { buttonClass, type ButtonVariant } from "@/components/ui/button-styles";

/**
 * A button that acts rather than navigates, styled identically to
 * `LinkButton`. Anything that changes the URL should stay a link so it can be
 * opened in a new tab, shared and crawled.
 */
export function Button({
  children,
  variant = "primary",
  className,
  type = "button",
  ...rest
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">) {
  return (
    <button type={type} className={buttonClass(variant, className)} {...rest}>
      {children}
    </button>
  );
}
