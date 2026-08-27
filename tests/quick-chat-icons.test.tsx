import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  QUICK_CHAT_OPTIONS,
  QuickChatIcon
} from "../src/ui/quick-chat/quick-chat-options";

describe("Quick Chat prompt icons", () => {
  it("uses one shared four-point star for every prompt", () => {
    const icons = QUICK_CHAT_OPTIONS.map(() => renderToStaticMarkup(createElement(QuickChatIcon)));

    expect(icons).toHaveLength(5);
    expect(new Set(icons).size).toBe(1);
    expect(icons[0]).toContain('data-icon="four-point-star"');
    expect(icons[0]).toContain("M16 4 18.6 13.4 28 16");
  });
});
