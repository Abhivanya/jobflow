import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusPill } from "./StatusPill";

describe("StatusPill", () => {
  it("shows the readable status", () => {
    render(<StatusPill status="FOLLOW_UP" />);
    expect(screen.getByText("Follow up")).toBeInTheDocument();
  });
});
