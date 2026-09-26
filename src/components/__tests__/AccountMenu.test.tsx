/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { AccountMenu } from "@/components/AccountMenu";
import { TooltipProvider } from "@/components/ui/tooltip";

function renderMenu(props: ComponentProps<typeof AccountMenu>) {
  return render(
    <TooltipProvider>
      <AccountMenu {...props} />
    </TooltipProvider>,
  );
}

const signedIn = { id: "user-1", email: "kru@krumath.com" };

afterEach(cleanup);

describe("AccountMenu (sidebar)", () => {
  it("shows the KruMath sign-in link when signed out", () => {
    renderMenu({
      user: null,
      signInHref: "/sign-in?returnUrl=%2Fkhmer-typing-master",
      onSignOut: vi.fn(),
    });

    const link = screen.getByRole("link", { name: "ចូលគណនី" });
    expect(link.getAttribute("href")).toBe("/sign-in?returnUrl=%2Fkhmer-typing-master");
  });

  it("shows the account identity and logs out when signed in", () => {
    const onSignOut = vi.fn();
    renderMenu({ user: signedIn, signInHref: "/sign-in", onSignOut });

    // Menu is closed until the account row is activated.
    expect(screen.queryByRole("menu")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /kru@krumath\.com/ }));

    expect(screen.getByRole("menu")).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /log out/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("menuitem", { name: /log out/i }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes the menu when the escape key is pressed", () => {
    renderMenu({ user: signedIn, signInHref: "/sign-in", onSignOut: vi.fn() });

    fireEvent.click(screen.getByRole("button", { name: /kru@krumath\.com/ }));
    expect(screen.getByRole("menu")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("AccountMenu (collapsed rail)", () => {
  it("links to sign-in with a compact icon control when signed out", () => {
    renderMenu({
      variant: "rail",
      user: null,
      signInHref: "/sign-in?returnUrl=%2Fkhmer-typing-master",
      onSignOut: vi.fn(),
    });

    const link = screen.getByRole("link", { name: "ចូលប្រើ" });
    expect(link.getAttribute("href")).toBe("/sign-in?returnUrl=%2Fkhmer-typing-master");
  });

  it("signs out directly since a dropdown cannot fit in the rail", () => {
    const onSignOut = vi.fn();
    renderMenu({ variant: "rail", user: signedIn, signInHref: "/sign-in", onSignOut });

    expect(screen.queryByRole("menu")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "ចាកចេញពីគណនី" }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
