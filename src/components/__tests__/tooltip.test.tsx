/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { Tip, TooltipProvider } from "@/components/ui/tooltip";

afterEach(cleanup);

describe("Tip", () => {
  it("renders the child alone when the label is empty", () => {
    render(
      <TooltipProvider>
        <Tip label="">
          <button type="button">Save</button>
        </Tip>
      </TooltipProvider>,
    );

    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("reveals the label through the tooltip on focus", async () => {
    render(
      <TooltipProvider delayDuration={0}>
        <Tip label="ទិដ្ឋភាពរួម">
          <button type="button">Overview</button>
        </Tip>
      </TooltipProvider>,
    );

    fireEvent.focus(screen.getByRole("button", { name: "Overview" }));

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.textContent).toContain("ទិដ្ឋភាពរួម");
  });
});
